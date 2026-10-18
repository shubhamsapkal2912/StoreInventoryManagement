package com.store.inventory.report;

import com.store.inventory.common.PageRequests;
import com.store.inventory.common.PageResponse;
import com.store.inventory.inventory.InventoryMovementRepository;
import com.store.inventory.inventory.InventoryService;
import com.store.inventory.inventory.InventoryService.MovementDto;
import com.store.inventory.order.OrderDtos.OrderDto;
import com.store.inventory.order.OrderRepository;
import com.store.inventory.order.OrderStatus;
import com.store.inventory.product.Product;
import com.store.inventory.product.ProductDtos.ProductDto;
import com.store.inventory.product.ProductRepository;
import com.store.inventory.product.ProductRepository.StockTotals;
import com.store.inventory.product.ProductService;
import com.store.inventory.product.ProductSpecs;
import com.store.inventory.product.StockStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ReportService {

    /**
     * Valuation method: on-hand quantity multiplied by the product's CURRENT cost price (not FIFO/average cost).
     * Only active products are valued.
     */
    public record InventoryRow(Long productId, String name, String sku, String categoryName, int quantity,
                               int reorderThreshold, BigDecimal costPrice, BigDecimal price, StockStatus stockStatus,
                               BigDecimal costValue, BigDecimal retailValue) {
        static InventoryRow from(Product p) {
            return new InventoryRow(p.getId(), p.getName(), p.getSku(),
                    p.getCategory() == null ? null : p.getCategory().getName(), p.getQuantity(),
                    p.getReorderThreshold(), p.getCostPrice(), p.getPrice(), p.stockStatus(),
                    p.getCostPrice().multiply(BigDecimal.valueOf(p.getQuantity())),
                    p.getPrice().multiply(BigDecimal.valueOf(p.getQuantity())));
        }
    }

    public record InventoryReport(long totalProducts, long totalUnits, BigDecimal totalCostValue,
                                  BigDecimal totalRetailValue, long lowStockCount, long outOfStockCount,
                                  PageResponse<InventoryRow> items) {}

    public record StatusSummary(OrderStatus status, long orders, BigDecimal total) {}

    public record OrderSummary(long totalOrders, BigDecimal revenue, List<StatusSummary> byStatus) {}

    public record Dashboard(long totalProducts, long totalUnits, long lowStockCount, long outOfStockCount,
                            BigDecimal inventoryValue, BigDecimal retailValue, List<MovementDto> recentMovements,
                            List<OrderDto> recentOrders) {}

    private final ProductRepository products;
    private final ProductService productService;
    private final InventoryService inventory;
    private final OrderRepository orders;
    private final InventoryMovementRepository movementRepo;

    public ReportService(ProductRepository products, ProductService productService, InventoryService inventory,
                         OrderRepository orders, InventoryMovementRepository movementRepo) {
        this.products = products;
        this.productService = productService;
        this.inventory = inventory;
        this.orders = orders;
        this.movementRepo = movementRepo;
    }

    public InventoryReport inventoryReport(Long categoryId, String q, StockStatus status, int page, int size,
                                           String sortBy, String dir) {
        StockTotals totals = categoryId == null ? products.totalsAll() : products.totalsByCategory(categoryId);
        Pageable pageable = PageRequests.of(page, size, sortBy, dir, ProductService.SORTABLE, "name");
        Page<Product> rows = products.findAll(ProductSpecs.filter(q, categoryId, status, true), pageable);
        return new InventoryReport(totals.getProducts(), totals.getUnits(), totals.getCostValue(),
                totals.getRetailValue(), products.countLowStock(), products.countOutOfStock(),
                PageResponse.of(rows, InventoryRow::from));
    }

    public PageResponse<ProductDto> stockReport(StockStatus status, Long categoryId, int page, int size) {
        return productService.search(null, categoryId, status, true, page, size, "quantity", "asc");
    }

    public OrderSummary orderSummary(LocalDate from, LocalDate to) {
        Instant start = from == null ? Instant.EPOCH : from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = to == null ? Instant.parse("9999-01-01T00:00:00Z")
                : to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Map<OrderStatus, StatusSummary> byStatus = new EnumMap<>(OrderStatus.class);
        for (OrderStatus s : OrderStatus.values()) {
            byStatus.put(s, new StatusSummary(s, 0, BigDecimal.ZERO));
        }
        orders.totalsByStatus(start, end).forEach(t ->
                byStatus.put(t.getStatus(), new StatusSummary(t.getStatus(), t.getOrders(), t.getTotal())));
        long count = byStatus.values().stream().mapToLong(StatusSummary::orders).sum();
        BigDecimal revenue = byStatus.values().stream().filter(s -> s.status() != OrderStatus.CANCELLED)
                .map(StatusSummary::total).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new OrderSummary(count, revenue, List.copyOf(byStatus.values()));
    }

    public Dashboard dashboard() {
        StockTotals t = products.totalsAll();
        List<MovementDto> recent = inventory.movements(null, null, null, null, null, 0, 8, "createdAt", "desc")
                .content();
        List<OrderDto> recentOrders = orders.findTop5ByOrderByCreatedAtDesc().stream().map(OrderDto::from).toList();
        return new Dashboard(t.getProducts(), t.getUnits(), products.countLowStock(), products.countOutOfStock(),
                t.getCostValue(), t.getRetailValue(), recent, recentOrders);
    }
}
