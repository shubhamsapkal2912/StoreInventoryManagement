package com.store.inventory.inventory;

import com.store.inventory.common.PageResponse;
import com.store.inventory.inventory.InventoryService.AdjustmentRequest;
import com.store.inventory.inventory.InventoryService.MovementDto;
import com.store.inventory.inventory.InventoryService.StockChangeRequest;
import com.store.inventory.product.ProductDtos.ProductDto;
import com.store.inventory.product.ProductService;
import com.store.inventory.product.StockStatus;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inventory")
@PreAuthorize("hasRole('STORE_MANAGER')")
public class InventoryController {

    private final InventoryService inventory;
    private final ProductService products;

    public InventoryController(InventoryService inventory, ProductService products) {
        this.inventory = inventory;
        this.products = products;
    }

    @GetMapping
    public PageResponse<ProductDto> levels(@RequestParam(required = false) String q,
                                           @RequestParam(required = false) Long categoryId,
                                           @RequestParam(required = false) StockStatus stockStatus,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "10") int size,
                                           @RequestParam(required = false) String sortBy,
                                           @RequestParam(required = false) String direction) {
        return products.search(q, categoryId, stockStatus, true, page, size, sortBy, direction);
    }

    @PostMapping("/stock-in")
    public ProductDto stockIn(@Valid @RequestBody StockChangeRequest req, @AuthenticationPrincipal Jwt jwt) {
        return inventory.stockIn(req, Long.valueOf(jwt.getSubject()));
    }

    @PostMapping("/stock-out")
    public ProductDto stockOut(@Valid @RequestBody StockChangeRequest req, @AuthenticationPrincipal Jwt jwt) {
        return inventory.stockOut(req, Long.valueOf(jwt.getSubject()));
    }

    @PostMapping("/adjustments")
    public ProductDto adjust(@Valid @RequestBody AdjustmentRequest req, @AuthenticationPrincipal Jwt jwt) {
        return inventory.adjust(req, Long.valueOf(jwt.getSubject()));
    }

    @GetMapping("/movements")
    public PageResponse<MovementDto> movements(@RequestParam(required = false) Long productId,
                                               @RequestParam(required = false) Long categoryId,
                                               @RequestParam(required = false) MovementType type,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size,
                                               @RequestParam(required = false) String sortBy,
                                               @RequestParam(required = false) String direction) {
        return inventory.movements(productId, categoryId, type, from, to, page, size, sortBy, direction);
    }

    @GetMapping("/low-stock")
    public PageResponse<ProductDto> lowStock(@RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return products.search(null, null, StockStatus.LOW_STOCK, true, page, size, "quantity", "asc");
    }
}
