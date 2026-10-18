package com.store.inventory.product;

import com.store.inventory.category.Category;
import com.store.inventory.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;

/**
 * quantity is only ever changed through InventoryService (which holds a row lock and writes an audit record).
 * {@link DynamicUpdate} ensures a product edit never overwrites a concurrently changed quantity.
 */
@Entity
@Table(name = "products")
@DynamicUpdate
@Getter
@Setter
public class Product extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 64)
    private String sku;

    @Column(length = 64)
    private String barcode;

    @Column(length = 2000)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "cost_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal costPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "reorder_threshold", nullable = false)
    private int reorderThreshold;

    @Column(nullable = false)
    private boolean active = true;

    public StockStatus stockStatus() {
        if (quantity <= 0) {
            return StockStatus.OUT_OF_STOCK;
        }
        return quantity <= reorderThreshold ? StockStatus.LOW_STOCK : StockStatus.IN_STOCK;
    }
}
