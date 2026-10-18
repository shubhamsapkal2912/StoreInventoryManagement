package com.store.inventory;

import java.util.Map;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProductInventoryIntegrationTest extends AbstractIntegrationTest {

    @Test
    void productCrudLifecycle() throws Exception {
        String h = bearer(managerToken());
        String sku = "CRUD-" + unique();
        mvc.perform(withBody(post("/api/categories").header("Authorization", h), Map.of("name", "Cat " + sku)))
                .andExpect(status().isCreated());

        String created = mvc.perform(withBody(post("/api/products").header("Authorization", h),
                        Map.of("name", "Widget", "sku", sku, "barcode", "BC-" + sku, "price", "12.50",
                                "costPrice", "5.25", "initialQuantity", 20, "reorderThreshold", 5)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.quantity").value(20))
                .andExpect(jsonPath("$.costPrice").value(5.25))
                .andExpect(jsonPath("$.stockStatus").value("IN_STOCK"))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) com.jayway.jsonpath.JsonPath.read(created, "$.id")).longValue();

        mvc.perform(get("/api/products").param("q", sku.toLowerCase()).header("Authorization", h))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/products").param("q", "BC-" + sku).header("Authorization", h))
                .andExpect(jsonPath("$.totalElements").value(1));

        mvc.perform(withBody(put("/api/products/" + id).header("Authorization", h),
                        Map.of("name", "Widget v2", "sku", sku, "price", "13.00", "costPrice", "5.25",
                                "reorderThreshold", 25)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Widget v2"))
                .andExpect(jsonPath("$.quantity").value(20))
                .andExpect(jsonPath("$.stockStatus").value("LOW_STOCK"));

        mvc.perform(delete("/api/products/" + id).header("Authorization", h)).andExpect(status().isNoContent());
        mvc.perform(get("/api/products/" + id).header("Authorization", h))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));
        mvc.perform(get("/api/catalog/" + id).header("Authorization", bearer(registerCustomer().token())))
                .andExpect(status().isNotFound());
    }

    @Test
    void duplicateSkuAndBarcodeAreRejected() throws Exception {
        String m = managerToken();
        String h = bearer(m);
        String sku = "DUP-" + unique();
        createProduct(m, sku, "1.00", "0.50", 0, 0);
        mvc.perform(withBody(post("/api/products").header("Authorization", h),
                        Map.of("name", "Other", "sku", sku.toLowerCase(), "price", "1", "costPrice", "1", "reorderThreshold", 0)))
                .andExpect(status().isConflict());
        String bc = "BC-" + unique();
        mvc.perform(withBody(post("/api/products").header("Authorization", h),
                Map.of("name", "A", "sku", "A-" + unique(), "barcode", bc, "price", "1", "costPrice", "1", "reorderThreshold", 0)))
                .andExpect(status().isCreated());
        mvc.perform(withBody(post("/api/products").header("Authorization", h),
                Map.of("name", "B", "sku", "B-" + unique(), "barcode", bc, "price", "1", "costPrice", "1", "reorderThreshold", 0)))
                .andExpect(status().isConflict());
    }

    @Test
    void productValidationErrors() throws Exception {
        mvc.perform(withBody(post("/api/products").header("Authorization", bearer(managerToken())),
                        Map.of("name", "", "sku", "bad sku!", "price", "-1", "costPrice", "1.234", "reorderThreshold", -1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.sku").exists())
                .andExpect(jsonPath("$.fieldErrors.price").exists())
                .andExpect(jsonPath("$.fieldErrors.costPrice").exists())
                .andExpect(jsonPath("$.fieldErrors.reorderThreshold").exists());
    }

    @Test
    void stockInOutAdjustAndAuditTrail() throws Exception {
        String m = managerToken();
        String h = bearer(m);
        long id = createProduct(m, "STK-" + unique(), "10.00", "4.00", 10, 3);

        mvc.perform(withBody(post("/api/inventory/stock-in").header("Authorization", h),
                        Map.of("productId", id, "quantity", 5, "reason", "Delivery", "reference", "PO-1")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.quantity").value(15));
        mvc.perform(withBody(post("/api/inventory/stock-out").header("Authorization", h),
                        Map.of("productId", id, "quantity", 12, "reason", "Damaged")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.quantity").value(3))
                .andExpect(jsonPath("$.stockStatus").value("LOW_STOCK"));
        mvc.perform(withBody(post("/api/inventory/adjustments").header("Authorization", h),
                        Map.of("productId", id, "newQuantity", 0, "reason", "Stock count")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.stockStatus").value("OUT_OF_STOCK"));

        mvc.perform(get("/api/inventory/movements").param("productId", String.valueOf(id)).header("Authorization", h))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(4))
                .andExpect(jsonPath("$.content[0].type").value("ADJUSTMENT"))
                .andExpect(jsonPath("$.content[0].quantityChange").value(-3))
                .andExpect(jsonPath("$.content[0].quantityAfter").value(0))
                .andExpect(jsonPath("$.content[0].createdBy").value("Store Manager"));
        mvc.perform(get("/api/reports/out-of-stock").header("Authorization", h)).andExpect(status().isOk());
    }

    @Test
    void negativeInventoryIsPrevented() throws Exception {
        String m = managerToken();
        String h = bearer(m);
        long id = createProduct(m, "NEG-" + unique(), "10.00", "4.00", 2, 1);
        mvc.perform(withBody(post("/api/inventory/stock-out").header("Authorization", h),
                        Map.of("productId", id, "quantity", 3)))
                .andExpect(status().isConflict());
        mvc.perform(withBody(post("/api/inventory/adjustments").header("Authorization", h),
                        Map.of("productId", id, "newQuantity", -1, "reason", "oops")))
                .andExpect(status().isBadRequest());
        mvc.perform(withBody(post("/api/inventory/stock-in").header("Authorization", h),
                        Map.of("productId", id, "quantity", 0)))
                .andExpect(status().isBadRequest());
        assertThat(quantityOf(m, id)).isEqualTo(2);
    }

    @Test
    void categoryInUseCannotBeDeleted() throws Exception {
        String h = bearer(managerToken());
        String body = mvc.perform(withBody(post("/api/categories").header("Authorization", h),
                Map.of("name", "InUse " + unique()))).andReturn().getResponse().getContentAsString();
        long catId = ((Number) com.jayway.jsonpath.JsonPath.read(body, "$.id")).longValue();
        mvc.perform(withBody(post("/api/products").header("Authorization", h),
                Map.of("name", "P", "sku", "C-" + unique(), "price", "1", "costPrice", "1", "reorderThreshold", 0,
                        "categoryId", catId))).andExpect(status().isCreated());
        mvc.perform(delete("/api/categories/" + catId).header("Authorization", h)).andExpect(status().isConflict());
    }

    @Test
    void inventoryReportCalculatesValuation() throws Exception {
        String m = managerToken();
        String h = bearer(m);
        String body = mvc.perform(withBody(post("/api/categories").header("Authorization", h),
                Map.of("name", "Valuation " + unique()))).andReturn().getResponse().getContentAsString();
        long catId = ((Number) com.jayway.jsonpath.JsonPath.read(body, "$.id")).longValue();
        for (int i = 0; i < 2; i++) {
            mvc.perform(withBody(post("/api/products").header("Authorization", h),
                    Map.of("name", "V" + i, "sku", "V" + i + "-" + unique(), "price", "10.00", "costPrice", "2.50",
                            "initialQuantity", 4, "reorderThreshold", 1, "categoryId", catId)))
                    .andExpect(status().isCreated());
        }
        mvc.perform(get("/api/reports/inventory").param("categoryId", String.valueOf(catId)).header("Authorization", h))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProducts").value(2))
                .andExpect(jsonPath("$.totalUnits").value(8))
                .andExpect(jsonPath("$.totalCostValue").value(20.0))
                .andExpect(jsonPath("$.totalRetailValue").value(80.0));
    }
}
