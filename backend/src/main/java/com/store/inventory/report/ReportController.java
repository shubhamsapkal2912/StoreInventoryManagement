package com.store.inventory.report;

import com.store.inventory.common.PageResponse;
import com.store.inventory.inventory.InventoryService;
import com.store.inventory.inventory.InventoryService.MovementDto;
import com.store.inventory.inventory.MovementType;
import com.store.inventory.product.ProductDtos.ProductDto;
import com.store.inventory.product.StockStatus;
import com.store.inventory.report.ReportService.Dashboard;
import com.store.inventory.report.ReportService.InventoryReport;
import com.store.inventory.report.ReportService.OrderSummary;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@PreAuthorize("hasRole('STORE_MANAGER')")
public class ReportController {

    private final ReportService reports;
    private final InventoryService inventory;

    public ReportController(ReportService reports, InventoryService inventory) {
        this.reports = reports;
        this.inventory = inventory;
    }

    @GetMapping("/manager/dashboard")
    public Dashboard dashboard() {
        return reports.dashboard();
    }

    @GetMapping("/reports/inventory")
    public InventoryReport inventory(@RequestParam(required = false) Long categoryId,
                                     @RequestParam(required = false) String q,
                                     @RequestParam(required = false) StockStatus stockStatus,
                                     @RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "20") int size,
                                     @RequestParam(required = false) String sortBy,
                                     @RequestParam(required = false) String direction) {
        return reports.inventoryReport(categoryId, q, stockStatus, page, size, sortBy, direction);
    }

    @GetMapping("/reports/low-stock")
    public PageResponse<ProductDto> lowStock(@RequestParam(required = false) Long categoryId,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return reports.stockReport(StockStatus.LOW_STOCK, categoryId, page, size);
    }

    @GetMapping("/reports/out-of-stock")
    public PageResponse<ProductDto> outOfStock(@RequestParam(required = false) Long categoryId,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return reports.stockReport(StockStatus.OUT_OF_STOCK, categoryId, page, size);
    }

    @GetMapping("/reports/inventory-movements")
    public PageResponse<MovementDto> movements(@RequestParam(required = false) Long productId,
                                               @RequestParam(required = false) Long categoryId,
                                               @RequestParam(required = false) MovementType type,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return inventory.movements(productId, categoryId, type, from, to, page, size, "createdAt", "desc");
    }

    @GetMapping("/reports/orders")
    public OrderSummary orders(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reports.orderSummary(from, to);
    }
}
