package com.store.inventory.order;

import com.store.inventory.common.PageResponse;
import com.store.inventory.order.CartService.CartDto;
import com.store.inventory.order.CartService.CartItemRequest;
import com.store.inventory.order.CartService.QuantityRequest;
import com.store.inventory.order.OrderDtos.OrderDto;
import com.store.inventory.order.OrderDtos.PlaceOrderRequest;
import com.store.inventory.order.OrderDtos.StatusUpdateRequest;
import com.store.inventory.user.Role;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class OrderController {

    private final OrderService orders;
    private final CartService cart;

    public OrderController(OrderService orders, CartService cart) {
        this.orders = orders;
        this.cart = cart;
    }

    private static Long id(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }

    // ---- cart (customers only) ----

    @GetMapping("/api/cart")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CartDto cart(@AuthenticationPrincipal Jwt jwt) {
        return cart.get(id(jwt));
    }

    @PostMapping("/api/cart/items")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CartDto addToCart(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CartItemRequest req) {
        return cart.add(id(jwt), req);
    }

    @PutMapping("/api/cart/items/{productId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CartDto setQuantity(@AuthenticationPrincipal Jwt jwt, @PathVariable Long productId,
                               @Valid @RequestBody QuantityRequest req) {
        return cart.setQuantity(id(jwt), productId, req);
    }

    @DeleteMapping("/api/cart/items/{productId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CartDto removeFromCart(@AuthenticationPrincipal Jwt jwt, @PathVariable Long productId) {
        return cart.remove(id(jwt), productId);
    }

    @DeleteMapping("/api/cart")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('CUSTOMER')")
    public void clearCart(@AuthenticationPrincipal Jwt jwt) {
        cart.clear(id(jwt));
    }

    // ---- customer orders ----

    @PostMapping("/api/orders")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CUSTOMER')")
    public OrderDto place(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PlaceOrderRequest req) {
        return orders.place(id(jwt), req);
    }

    @GetMapping("/api/orders/my-orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public PageResponse<OrderDto> myOrders(@AuthenticationPrincipal Jwt jwt,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "10") int size) {
        return orders.myOrders(id(jwt), page, size);
    }

    @GetMapping("/api/orders/{id}")
    public OrderDto get(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        Role role = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(Role.STORE_MANAGER.authority()))
                ? Role.STORE_MANAGER : Role.CUSTOMER;
        return orders.get(id, id(jwt), role);
    }

    @PostMapping("/api/orders/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public OrderDto cancel(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return orders.cancelByCustomer(id, id(jwt));
    }

    // ---- manager order management ----

    @GetMapping("/api/manager/orders")
    @PreAuthorize("hasRole('STORE_MANAGER')")
    public PageResponse<OrderDto> managerOrders(@RequestParam(required = false) OrderStatus status,
                                                @RequestParam(required = false) String q,
                                                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "10") int size,
                                                @RequestParam(required = false) String sortBy,
                                                @RequestParam(required = false) String direction) {
        return orders.list(null, status, from, to, q, page, size, sortBy, direction);
    }

    @PatchMapping("/api/manager/orders/{id}/status")
    @PreAuthorize("hasRole('STORE_MANAGER')")
    public OrderDto updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest req,
                                 @AuthenticationPrincipal Jwt jwt) {
        return orders.updateStatus(id, req.status(), id(jwt));
    }
}
