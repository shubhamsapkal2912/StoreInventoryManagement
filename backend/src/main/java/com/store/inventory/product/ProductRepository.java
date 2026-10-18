package com.store.inventory.product;

import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    boolean existsByBarcode(String barcode);

    boolean existsByBarcodeAndIdNot(String barcode, Long id);

    long countByCategoryId(Long categoryId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    interface StockTotals {
        long getProducts();

        long getUnits();

        BigDecimal getCostValue();

        BigDecimal getRetailValue();
    }

    @Query("""
            select count(p) as products, coalesce(sum(p.quantity), 0) as units,
                   coalesce(sum(p.quantity * p.costPrice), 0) as costValue,
                   coalesce(sum(p.quantity * p.price), 0) as retailValue
            from Product p where p.active = true""")
    StockTotals totalsAll();

    @Query("""
            select count(p) as products, coalesce(sum(p.quantity), 0) as units,
                   coalesce(sum(p.quantity * p.costPrice), 0) as costValue,
                   coalesce(sum(p.quantity * p.price), 0) as retailValue
            from Product p where p.active = true and p.category.id = :categoryId""")
    StockTotals totalsByCategory(@Param("categoryId") Long categoryId);

    @Query("select count(p) from Product p where p.active = true and p.quantity > 0 and p.quantity <= p.reorderThreshold")
    long countLowStock();

    @Query("select count(p) from Product p where p.active = true and p.quantity = 0")
    long countOutOfStock();
}
