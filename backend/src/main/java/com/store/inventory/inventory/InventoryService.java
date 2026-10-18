package com.store.inventory.inventory;

import com.store.inventory.common.PageRequests;
import com.store.inventory.common.PageResponse;
import com.store.inventory.exception.ApiException;
import com.store.inventory.product.Product;
import com.store.inventory.product.ProductDtos.ProductDto;
import com.store.inventory.product.ProductRepository;
import com.store.inventory.user.User;
import com.store.inventory.user.UserRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {

    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);
    private static final Set<String> MOVEMENT_SORTS = Set.of("createdAt", "quantityChange", "type");

    public record StockChangeRequest(@NotNull Long productId, @NotNull @Min(1) Integer quantity,
                                     @Size(max = 500) String reason, @Size(max = 100) String reference) {}

    public record AdjustmentRequest(@NotNull Long productId, @NotNull @Min(0) Integer newQuantity,
                                    @NotBlank @Size(max = 500) String reason, @Size(max = 100) String reference) {}

    public record MovementDto(Long id, Long productId, String productName, String sku, MovementType type,
                              int quantityChange, int quantityAfter, String reason, String reference,
                              String createdBy, Instant createdAt) {
        static MovementDto from(InventoryMovement m) {
            return new MovementDto(m.getId(), m.getProduct().getId(), m.getProduct().getName(),
                    m.getProduct().getSku(), m.getType(), m.getQuantityChange(), m.getQuantityAfter(),
                    m.getReason(), m.getReference(), m.getCreatedBy() == null ? null : m.getCreatedBy().getFullName(),
                    m.getCreatedAt());
        }
    }

    private final ProductRepository products;
    private final InventoryMovementRepository movements;
    private final UserRepository users;

    public InventoryService(ProductRepository products, InventoryMovementRepository movements, UserRepository users) {
        this.products = products;
        this.movements = movements;
        this.users = users;
    }

    @Transactional
    public ProductDto stockIn(StockChangeRequest req, Long actorId) {
        return ProductDto.from(applyChange(req.productId(), MovementType.STOCK_IN, req.quantity(),
                req.reason(), req.reference(), actorId));
    }

    @Transactional
    public ProductDto stockOut(StockChangeRequest req, Long actorId) {
        return ProductDto.from(applyChange(req.productId(), MovementType.STOCK_OUT, -req.quantity(),
                req.reason(), req.reference(), actorId));
    }

    @Transactional
    public ProductDto adjust(AdjustmentRequest req, Long actorId) {
        Product p = lock(req.productId());
        int delta = req.newQuantity() - p.getQuantity();
        if (delta == 0) {
            throw ApiException.badRequest("New quantity equals the current quantity; nothing to adjust");
        }
        return ProductDto.from(applyChange(req.productId(), MovementType.ADJUSTMENT, delta, req.reason(),
                req.reference(), actorId));
    }

    /**
     * The single place where product.quantity changes. Takes a pessimistic row lock, rejects negative results
     * and writes the audit record in the same transaction. Callers that touch several products must lock them
     * in ascending id order to avoid deadlocks.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Product applyChange(Long productId, MovementType type, int delta, String reason, String reference,
                               Long actorId) {
        Product p = lock(productId);
        int after = p.getQuantity() + delta;
        if (after < 0) {
            throw ApiException.conflict("Insufficient stock for '" + p.getName() + "': available "
                    + p.getQuantity() + ", requested " + Math.abs(delta));
        }
        p.setQuantity(after);
        InventoryMovement m = new InventoryMovement();
        m.setProduct(p);
        m.setType(type);
        m.setQuantityChange(delta);
        m.setQuantityAfter(after);
        m.setReason(reason);
        m.setReference(reference);
        m.setCreatedBy(actorId == null ? null : users.getReferenceById(actorId));
        movements.save(m);
        log.info("Inventory {} product={} change={} after={} actor={} ref={}", type, productId, delta, after,
                actorId, reference);
        return p;
    }

    @Transactional(readOnly = true)
    public PageResponse<MovementDto> movements(Long productId, Long categoryId, MovementType type, LocalDate from,
                                               LocalDate to, int page, int size, String sortBy, String dir) {
        Pageable pageable = PageRequests.of(page, size, sortBy, dir, MOVEMENT_SORTS, "createdAt");
        Specification<InventoryMovement> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (productId != null) {
                ps.add(cb.equal(root.get("product").get("id"), productId));
            }
            if (categoryId != null) {
                ps.add(cb.equal(root.get("product").get("category").get("id"), categoryId));
            }
            if (type != null) {
                ps.add(cb.equal(root.get("type"), type));
            }
            if (from != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay().toInstant(ZoneOffset.UTC)));
            }
            if (to != null) {
                ps.add(cb.lessThan(root.get("createdAt"), to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
        Page<InventoryMovement> result = movements.findAll(spec, pageable);
        return PageResponse.of(result, MovementDto::from);
    }

    private Product lock(Long productId) {
        return products.findByIdForUpdate(productId).orElseThrow(() -> ApiException.notFound("Product not found"));
    }
}
