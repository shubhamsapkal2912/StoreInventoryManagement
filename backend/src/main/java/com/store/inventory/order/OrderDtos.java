package com.store.inventory.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {}

    public record PlaceOrderRequest(@NotBlank @Size(max = 500) String shippingAddress, @Size(max = 1000) String notes) {}

    public record StatusUpdateRequest(@NotNull OrderStatus status) {}

    public record OrderItemDto(Long productId, String productName, String sku, BigDecimal unitPrice, int quantity,
                               BigDecimal lineTotal) {}

    public record OrderCustomerDto(Long id, String fullName, String email) {}

    public record OrderDto(Long id, OrderStatus status, BigDecimal totalAmount, String shippingAddress, String notes,
                           Instant createdAt, Instant updatedAt, OrderCustomerDto customer,
                           List<OrderItemDto> items) {
        public static OrderDto from(Order o) {
            return new OrderDto(o.getId(), o.getStatus(), o.getTotalAmount(), o.getShippingAddress(), o.getNotes(),
                    o.getCreatedAt(), o.getUpdatedAt(),
                    new OrderCustomerDto(o.getCustomer().getId(), o.getCustomer().getFullName(),
                            o.getCustomer().getEmail()),
                    o.getItems().stream().map(i -> new OrderItemDto(i.getProduct().getId(), i.getProductName(),
                            i.getSku(), i.getUnitPrice(), i.getQuantity(), i.getLineTotal())).toList());
        }
    }
}
