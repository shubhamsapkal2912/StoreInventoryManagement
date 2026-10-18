package com.store.inventory.order;

import com.store.inventory.exception.ApiException;
import com.store.inventory.product.Product;
import com.store.inventory.product.ProductRepository;
import com.store.inventory.product.StockStatus;
import com.store.inventory.user.UserRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {

    public record CartItemRequest(@NotNull Long productId, @NotNull @Min(1) @Max(1000) Integer quantity) {}

    public record QuantityRequest(@NotNull @Min(1) @Max(1000) Integer quantity) {}

    public record CartItemDto(Long productId, String name, String sku, BigDecimal unitPrice, int quantity,
                              BigDecimal lineTotal, int availableQuantity, boolean available,
                              StockStatus stockStatus) {}

    public record CartDto(List<CartItemDto> items, int totalUnits, BigDecimal subtotal) {}

    private final CartItemRepository carts;
    private final ProductRepository products;
    private final UserRepository users;

    public CartService(CartItemRepository carts, ProductRepository products, UserRepository users) {
        this.carts = carts;
        this.products = products;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public CartDto get(Long userId) {
        return toDto(carts.findByUserIdOrderByIdAsc(userId));
    }

    /** Adds to the existing quantity (or creates the line). */
    @Transactional
    public CartDto add(Long userId, CartItemRequest req) {
        Product p = requireOrderable(req.productId());
        CartItem item = carts.findByUserIdAndProductId(userId, p.getId()).orElseGet(() -> {
            CartItem c = new CartItem();
            c.setUser(users.getReferenceById(userId));
            c.setProduct(p);
            return c;
        });
        int target = item.getQuantity() + req.quantity();
        checkAvailable(p, target);
        item.setQuantity(target);
        carts.save(item);
        return get(userId);
    }

    @Transactional
    public CartDto setQuantity(Long userId, Long productId, QuantityRequest req) {
        Product p = requireOrderable(productId);
        checkAvailable(p, req.quantity());
        CartItem item = carts.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> ApiException.notFound("Item is not in your cart"));
        item.setQuantity(req.quantity());
        return get(userId);
    }

    @Transactional
    public CartDto remove(Long userId, Long productId) {
        carts.deleteByUserIdAndProductId(userId, productId);
        return get(userId);
    }

    @Transactional
    public void clear(Long userId) {
        carts.deleteByUserId(userId);
    }

    private Product requireOrderable(Long productId) {
        Product p = products.findById(productId).orElseThrow(() -> ApiException.notFound("Product not found"));
        if (!p.isActive()) {
            throw ApiException.notFound("Product not found");
        }
        return p;
    }

    private void checkAvailable(Product p, int wanted) {
        if (wanted > p.getQuantity()) {
            throw ApiException.conflict("Only " + p.getQuantity() + " unit(s) of '" + p.getName() + "' available");
        }
    }

    private CartDto toDto(List<CartItem> items) {
        List<CartItemDto> dtos = items.stream().map(ci -> {
            Product p = ci.getProduct();
            BigDecimal line = p.getPrice().multiply(BigDecimal.valueOf(ci.getQuantity()));
            return new CartItemDto(p.getId(), p.getName(), p.getSku(), p.getPrice(), ci.getQuantity(), line,
                    Math.max(p.getQuantity(), 0), p.isActive() && p.getQuantity() >= ci.getQuantity(),
                    p.stockStatus());
        }).toList();
        BigDecimal subtotal = dtos.stream().map(CartItemDto::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        int units = dtos.stream().mapToInt(CartItemDto::quantity).sum();
        return new CartDto(dtos, units, subtotal);
    }
}
