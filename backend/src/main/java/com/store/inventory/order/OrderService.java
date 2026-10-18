package com.store.inventory.order;

import com.store.inventory.common.PageRequests;
import com.store.inventory.common.PageResponse;
import com.store.inventory.exception.ApiException;
import com.store.inventory.inventory.InventoryService;
import com.store.inventory.inventory.MovementType;
import com.store.inventory.order.OrderDtos.OrderDto;
import com.store.inventory.order.OrderDtos.PlaceOrderRequest;
import com.store.inventory.product.Product;
import com.store.inventory.product.ProductRepository;
import com.store.inventory.user.Role;
import com.store.inventory.user.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final Set<String> SORTS = Set.of("createdAt", "totalAmount", "status");

    private final OrderRepository orders;
    private final CartItemRepository carts;
    private final ProductRepository products;
    private final InventoryService inventory;
    private final UserRepository users;

    public OrderService(OrderRepository orders, CartItemRepository carts, ProductRepository products,
                        InventoryService inventory, UserRepository users) {
        this.orders = orders;
        this.carts = carts;
        this.products = products;
        this.inventory = inventory;
        this.users = users;
    }

    /**
     * Turns the caller's server-side cart into an order. Prices and totals come from the database only.
     * Products are locked in ascending id order (deadlock-free), validated, then stock is decremented
     * and audited inside the same transaction, so concurrent checkouts cannot oversell.
     */
    @Transactional
    public OrderDto place(Long customerId, PlaceOrderRequest req) {
        List<CartItem> cart = new ArrayList<>(carts.findAllByUserIdOrderByIdAsc(customerId));
        if (cart.isEmpty()) {
            throw ApiException.badRequest("Your cart is empty");
        }
        cart.sort(Comparator.comparing(ci -> ci.getProduct().getId()));

        Order order = new Order();
        order.setCustomer(users.getReferenceById(customerId));
        order.setShippingAddress(req.shippingAddress().trim());
        order.setNotes(req.notes() == null || req.notes().isBlank() ? null : req.notes().trim());

        BigDecimal total = BigDecimal.ZERO;
        for (CartItem ci : cart) {
            Product p = products.findByIdForUpdate(ci.getProduct().getId())
                    .orElseThrow(() -> ApiException.notFound("Product not found"));
            if (!p.isActive()) {
                throw ApiException.conflict("'" + p.getName() + "' is no longer available");
            }
            if (p.getQuantity() < ci.getQuantity()) {
                throw ApiException.conflict("Insufficient stock for '" + p.getName() + "': available "
                        + p.getQuantity() + ", in cart " + ci.getQuantity());
            }
            OrderItem item = new OrderItem();
            item.setProduct(p);
            item.setProductName(p.getName());
            item.setSku(p.getSku());
            item.setUnitPrice(p.getPrice());
            item.setQuantity(ci.getQuantity());
            item.setLineTotal(p.getPrice().multiply(BigDecimal.valueOf(ci.getQuantity())));
            order.addItem(item);
            total = total.add(item.getLineTotal());
        }
        order.setTotalAmount(total);
        Order saved = orders.saveAndFlush(order);
        for (OrderItem item : saved.getItems()) {
            inventory.applyChange(item.getProduct().getId(), MovementType.ORDER_PLACED, -item.getQuantity(),
                    "Order placed", "ORDER-" + saved.getId(), customerId);
        }
        carts.deleteByUserId(customerId);
        log.info("Order placed id={} customer={} total={}", saved.getId(), customerId, total);
        return OrderDto.from(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderDto> myOrders(Long customerId, int page, int size) {
        return list(customerId, null, null, null, null, page, size, "createdAt", "desc");
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderDto> list(Long customerId, OrderStatus status, LocalDate from, LocalDate to,
                                       String q, int page, int size, String sortBy, String dir) {
        Pageable pageable = PageRequests.of(page, size, sortBy, dir, SORTS, "createdAt");
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (customerId != null) {
                ps.add(cb.equal(root.get("customer").get("id"), customerId));
            }
            if (status != null) {
                ps.add(cb.equal(root.get("status"), status));
            }
            if (from != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay().toInstant(ZoneOffset.UTC)));
            }
            if (to != null) {
                ps.add(cb.lessThan(root.get("createdAt"), to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                ps.add(cb.or(cb.like(cb.lower(root.get("customer").get("fullName")), like, '\\'),
                        cb.like(cb.lower(root.get("customer").get("email")), like, '\\')));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
        Page<Order> result = orders.findAll(spec, pageable);
        return PageResponse.of(result, OrderDto::from);
    }

    /** Customers only see their own orders; a foreign order id looks exactly like a missing one. */
    @Transactional(readOnly = true)
    public OrderDto get(Long orderId, Long actorId, Role role) {
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (role == Role.CUSTOMER && !o.getCustomer().getId().equals(actorId)) {
            throw ApiException.notFound("Order not found");
        }
        return OrderDto.from(o);
    }

    @Transactional
    public OrderDto cancelByCustomer(Long orderId, Long customerId) {
        Order o = orders.findByIdForUpdate(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (!o.getCustomer().getId().equals(customerId)) {
            throw ApiException.notFound("Order not found");
        }
        if (o.getStatus() != OrderStatus.PLACED) {
            throw ApiException.conflict("Only orders that have not been confirmed can be cancelled");
        }
        cancel(o, customerId);
        return OrderDto.from(o);
    }

    @Transactional
    public OrderDto updateStatus(Long orderId, OrderStatus next, Long managerId) {
        Order o = orders.findByIdForUpdate(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (!o.getStatus().allowedNext().contains(next)) {
            throw ApiException.conflict("Cannot change order status from " + o.getStatus() + " to " + next);
        }
        if (next == OrderStatus.CANCELLED) {
            cancel(o, managerId);
        } else {
            o.setStatus(next);
            log.info("Order {} -> {} by user={}", orderId, next, managerId);
        }
        return OrderDto.from(o);
    }

    /** Restores stock exactly once: callers hold the order row lock and have verified the status. */
    private void cancel(Order o, Long actorId) {
        o.setStatus(OrderStatus.CANCELLED);
        o.getItems().stream().sorted(Comparator.comparing(i -> i.getProduct().getId()))
                .forEach(i -> inventory.applyChange(i.getProduct().getId(), MovementType.ORDER_CANCELLED,
                        i.getQuantity(), "Order cancelled", "ORDER-" + o.getId(), actorId));
        log.info("Order cancelled id={} by user={}", o.getId(), actorId);
    }
}
