package com.store.inventory.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public final class ProductDtos {

    private ProductDtos() {}

    /** initialQuantity is honoured on create only; stock changes after that go through the inventory API. */
    public record ProductRequest(
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Size(max = 64) @Pattern(regexp = "[A-Za-z0-9._-]+", message = "must contain only letters, digits, '.', '_' or '-'") String sku,
            @Size(max = 64) String barcode,
            @Size(max = 2000) String description,
            Long categoryId,
            @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal price,
            @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal costPrice,
            @Min(0) Integer initialQuantity,
            @NotNull @Min(0) Integer reorderThreshold,
            Boolean active) {}

    /** Manager view: includes cost price. */
    public record ProductDto(Long id, String name, String sku, String barcode, String description,
                             Long categoryId, String categoryName, BigDecimal price, BigDecimal costPrice,
                             int quantity, int reorderThreshold, boolean active, StockStatus stockStatus,
                             Instant createdAt, Instant updatedAt) {
        public static ProductDto from(Product p) {
            return new ProductDto(p.getId(), p.getName(), p.getSku(), p.getBarcode(), p.getDescription(),
                    p.getCategory() == null ? null : p.getCategory().getId(),
                    p.getCategory() == null ? null : p.getCategory().getName(),
                    p.getPrice(), p.getCostPrice(), p.getQuantity(), p.getReorderThreshold(), p.isActive(),
                    p.stockStatus(), p.getCreatedAt(), p.getUpdatedAt());
        }
    }

    /** Customer view: no cost price, no reorder threshold, no internal timestamps. */
    public record CatalogProductDto(Long id, String name, String sku, String description, Long categoryId,
                                    String categoryName, BigDecimal price, int availableQuantity,
                                    StockStatus stockStatus, boolean available) {
        public static CatalogProductDto from(Product p) {
            return new CatalogProductDto(p.getId(), p.getName(), p.getSku(), p.getDescription(),
                    p.getCategory() == null ? null : p.getCategory().getId(),
                    p.getCategory() == null ? null : p.getCategory().getName(),
                    p.getPrice(), Math.max(p.getQuantity(), 0), p.stockStatus(), p.getQuantity() > 0);
        }
    }
}
