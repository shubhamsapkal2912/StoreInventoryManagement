package com.store.inventory;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthorizationIntegrationTest extends AbstractIntegrationTest {

    @Test
    void anonymousRequestsGet401() throws Exception {
        mvc.perform(get("/api/products")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/catalog")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/manager/dashboard")).andExpect(status().isUnauthorized());
    }

    @Test
    void customerIsForbiddenFromEveryManagerEndpoint() throws Exception {
        String t = registerCustomer().token();
        String h = bearer(t);
        MockHttpServletRequestBuilder[] calls = {
                get("/api/products"), get("/api/products/1"),
                withBody(post("/api/products"), Map.of("name", "x", "sku", "x", "price", "1", "costPrice", "1", "reorderThreshold", 1)),
                put("/api/products/1").contentType("application/json").content("{}"),
                delete("/api/products/1"),
                withBody(post("/api/categories"), Map.of("name", "Hack")),
                delete("/api/categories/1"),
                get("/api/inventory"), get("/api/inventory/movements"), get("/api/inventory/low-stock"),
                withBody(post("/api/inventory/stock-in"), Map.of("productId", 1, "quantity", 5)),
                withBody(post("/api/inventory/stock-out"), Map.of("productId", 1, "quantity", 1)),
                withBody(post("/api/inventory/adjustments"), Map.of("productId", 1, "newQuantity", 99, "reason", "cheat")),
                get("/api/reports/inventory"), get("/api/reports/low-stock"), get("/api/reports/out-of-stock"),
                get("/api/reports/inventory-movements"), get("/api/reports/orders"),
                get("/api/manager/dashboard"), get("/api/manager/orders"),
                withBody(patch("/api/manager/orders/1/status"), Map.of("status", "CONFIRMED"))
        };
        for (MockHttpServletRequestBuilder call : calls) {
            mvc.perform(call.header("Authorization", h)).andExpect(status().isForbidden());
        }
    }

    @Test
    void managerCannotUseCustomerOnlyCartAndCheckout() throws Exception {
        String h = bearer(managerToken());
        mvc.perform(get("/api/cart").header("Authorization", h)).andExpect(status().isForbidden());
        mvc.perform(withBody(post("/api/orders").header("Authorization", h),
                Map.of("shippingAddress", "1 Main St"))).andExpect(status().isForbidden());
    }

    @Test
    void catalogNeverExposesCostPrice() throws Exception {
        String m = managerToken();
        String sku = "CAT-" + unique();
        long id = createProduct(m, sku, "19.99", "7.50", 10, 2);
        Customer c = registerCustomer();
        mvc.perform(get("/api/catalog/" + id).header("Authorization", bearer(c.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.price").value(19.99))
                .andExpect(jsonPath("$.costPrice").doesNotExist())
                .andExpect(jsonPath("$.reorderThreshold").doesNotExist());
        mvc.perform(get("/api/catalog").param("q", sku).header("Authorization", bearer(c.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].costPrice").doesNotExist());
    }

    @Test
    void customerCanOnlyReadAndUpdateOwnProfile() throws Exception {
        Customer a = registerCustomer();
        Customer b = registerCustomer();
        mvc.perform(get("/api/profile").header("Authorization", bearer(a.token())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value(a.email()));
        mvc.perform(withBody(put("/api/profile").header("Authorization", bearer(b.token())),
                        Map.of("fullName", "Bee Updated", "phone", "555-0100", "address", "2 Side St")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.fullName").value("Bee Updated"));
        mvc.perform(get("/api/profile").header("Authorization", bearer(a.token())))
                .andExpect(jsonPath("$.fullName").value("Test Customer"));
    }

    @Test
    void unknownErrorShapeIsConsistent() throws Exception {
        mvc.perform(get("/api/products/999999").header("Authorization", bearer(managerToken())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.path").value("/api/products/999999"))
                .andExpect(jsonPath("$.message").exists());
    }
}
