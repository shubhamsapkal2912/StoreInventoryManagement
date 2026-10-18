package com.store.inventory;

import com.jayway.jsonpath.JsonPath;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class OrderIntegrationTest extends AbstractIntegrationTest {

    private void addToCart(Customer c, long productId, int qty) throws Exception {
        mvc.perform(withBody(post("/api/cart/items").header("Authorization", bearer(c.token())),
                Map.of("productId", productId, "quantity", qty))).andExpect(status().isOk());
    }

    private long placeOrder(Customer c) throws Exception {
        String body = mvc.perform(withBody(post("/api/orders").header("Authorization", bearer(c.token())),
                        Map.of("shippingAddress", "1 Test Street", "notes", "leave at door")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    @Test
    void orderUsesServerPricesDecrementsStockAndClearsCart() throws Exception {
        String m = managerToken();
        long p1 = createProduct(m, "ORD-" + unique(), "19.99", "8.00", 10, 2);
        long p2 = createProduct(m, "ORD-" + unique(), "5.05", "2.00", 4, 1);
        Customer c = registerCustomer();
        addToCart(c, p1, 2);
        addToCart(c, p2, 3);

        mvc.perform(get("/api/cart").header("Authorization", bearer(c.token())))
                .andExpect(jsonPath("$.subtotal").value(55.13))
                .andExpect(jsonPath("$.totalUnits").value(5));

        // unknown/forged fields such as totals or prices are ignored; the server computes everything
        String body = mvc.perform(withBody(post("/api/orders").header("Authorization", bearer(c.token())),
                        Map.of("shippingAddress", "1 Test Street", "totalAmount", "0.01")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PLACED"))
                .andExpect(jsonPath("$.totalAmount").value(55.13))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andReturn().getResponse().getContentAsString();
        long orderId = ((Number) JsonPath.read(body, "$.id")).longValue();

        assertThat(quantityOf(m, p1)).isEqualTo(8);
        assertThat(quantityOf(m, p2)).isEqualTo(1);
        mvc.perform(get("/api/cart").header("Authorization", bearer(c.token())))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/inventory/movements").param("productId", String.valueOf(p1)).header("Authorization", bearer(m)))
                .andExpect(jsonPath("$.content[0].type").value("ORDER_PLACED"))
                .andExpect(jsonPath("$.content[0].reference").value("ORDER-" + orderId));

        // later price change does not alter the historical order
        mvc.perform(withBody(put("/api/products/" + p1).header("Authorization", bearer(m)),
                Map.of("name", "Repriced", "sku", JsonPath.read(mvc.perform(get("/api/products/" + p1)
                        .header("Authorization", bearer(m))).andReturn().getResponse().getContentAsString(), "$.sku"),
                        "price", "99.00", "costPrice", "8.00", "reorderThreshold", 2))).andExpect(status().isOk());
        mvc.perform(get("/api/orders/" + orderId).header("Authorization", bearer(c.token())))
                .andExpect(jsonPath("$.totalAmount").value(55.13))
                .andExpect(jsonPath("$.items[0].unitPrice").value(19.99));
    }

    @Test
    void cannotAddMoreThanAvailableOrCheckoutEmptyCart() throws Exception {
        String m = managerToken();
        long p = createProduct(m, "LIM-" + unique(), "3.00", "1.00", 2, 0);
        Customer c = registerCustomer();
        mvc.perform(withBody(post("/api/cart/items").header("Authorization", bearer(c.token())),
                Map.of("productId", p, "quantity", 3))).andExpect(status().isConflict());
        mvc.perform(withBody(post("/api/orders").header("Authorization", bearer(c.token())),
                Map.of("shippingAddress", "x"))).andExpect(status().isBadRequest());
    }

    @Test
    void checkoutFailsWhenStockDroppedAfterCarting() throws Exception {
        String m = managerToken();
        long p = createProduct(m, "DROP-" + unique(), "3.00", "1.00", 5, 0);
        Customer c = registerCustomer();
        addToCart(c, p, 4);
        mvc.perform(withBody(post("/api/inventory/stock-out").header("Authorization", bearer(m)),
                Map.of("productId", p, "quantity", 3))).andExpect(status().isOk());
        mvc.perform(withBody(post("/api/orders").header("Authorization", bearer(c.token())),
                Map.of("shippingAddress", "1 Test Street"))).andExpect(status().isConflict());
        assertThat(quantityOf(m, p)).isEqualTo(2); // untouched by the failed checkout
    }

    @Test
    void customersCannotSeeOrCancelEachOthersOrders() throws Exception {
        String m = managerToken();
        long p = createProduct(m, "OWN-" + unique(), "3.00", "1.00", 5, 0);
        Customer a = registerCustomer();
        Customer b = registerCustomer();
        addToCart(a, p, 1);
        long orderId = placeOrder(a);

        mvc.perform(get("/api/orders/" + orderId).header("Authorization", bearer(b.token()))).andExpect(status().isNotFound());
        mvc.perform(post("/api/orders/" + orderId + "/cancel").header("Authorization", bearer(b.token())))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/orders/my-orders").header("Authorization", bearer(b.token())))
                .andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/orders/my-orders").header("Authorization", bearer(a.token())))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/orders/" + orderId).header("Authorization", bearer(m))).andExpect(status().isOk());
    }

    @Test
    void cancellationRestoresStockExactlyOnce() throws Exception {
        String m = managerToken();
        long p = createProduct(m, "CAN-" + unique(), "3.00", "1.00", 6, 0);
        Customer c = registerCustomer();
        addToCart(c, p, 4);
        long orderId = placeOrder(c);
        assertThat(quantityOf(m, p)).isEqualTo(2);

        mvc.perform(post("/api/orders/" + orderId + "/cancel").header("Authorization", bearer(c.token())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(quantityOf(m, p)).isEqualTo(6);
        mvc.perform(post("/api/orders/" + orderId + "/cancel").header("Authorization", bearer(c.token())))
                .andExpect(status().isConflict());
        mvc.perform(withBody(patch("/api/manager/orders/" + orderId + "/status").header("Authorization", bearer(m)),
                Map.of("status", "CANCELLED"))).andExpect(status().isConflict());
        assertThat(quantityOf(m, p)).isEqualTo(6);
        mvc.perform(get("/api/inventory/movements").param("productId", String.valueOf(p)).param("type", "ORDER_CANCELLED")
                .header("Authorization", bearer(m))).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void managerWorkflowEnforcesStatusTransitions() throws Exception {
        String m = managerToken();
        long p = createProduct(m, "WF-" + unique(), "3.00", "1.00", 6, 0);
        Customer c = registerCustomer();
        addToCart(c, p, 1);
        long id = placeOrder(c);
        String url = "/api/manager/orders/" + id + "/status";

        mvc.perform(withBody(patch(url).header("Authorization", bearer(m)), Map.of("status", "SHIPPED")))
                .andExpect(status().isConflict());
        for (String s : List.of("CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED")) {
            mvc.perform(withBody(patch(url).header("Authorization", bearer(m)), Map.of("status", s)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value(s));
        }
        // customer can no longer cancel a delivered order
        mvc.perform(post("/api/orders/" + id + "/cancel").header("Authorization", bearer(c.token())))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/manager/orders").param("status", "DELIVERED").param("q", c.email())
                .header("Authorization", bearer(m)))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void concurrentCheckoutsNeverOversell() throws Exception {
        String m = managerToken();
        int stock = 3;
        int buyers = 10;
        long p = createProduct(m, "RACE-" + unique(), "9.99", "4.00", stock, 0);
        List<Customer> customers = new ArrayList<>();
        for (int i = 0; i < buyers; i++) {
            Customer c = registerCustomer();
            addToCart(c, p, 1);
            customers.add(c);
        }
        ExecutorService pool = Executors.newFixedThreadPool(buyers);
        try {
            List<Callable<Integer>> tasks = customers.stream().<Callable<Integer>>map(c -> () ->
                    mvc.perform(withBody(post("/api/orders").header("Authorization", bearer(c.token())),
                            Map.of("shippingAddress", "Race Road"))).andReturn().getResponse().getStatus()).toList();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> f : pool.invokeAll(tasks)) {
                statuses.add(f.get());
            }
            assertThat(statuses.stream().filter(s -> s == 201).count()).isEqualTo(stock);
            assertThat(statuses.stream().filter(s -> s == 409).count()).isEqualTo(buyers - stock);
            assertThat(quantityOf(m, p)).isZero();
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void concurrentStockOutsNeverGoNegative() throws Exception {
        String m = managerToken();
        long p = createProduct(m, "SO-" + unique(), "9.99", "4.00", 5, 0);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<Integer>> tasks = new ArrayList<>();
            for (int i = 0; i < 8; i++) {
                tasks.add(() -> mvc.perform(withBody(post("/api/inventory/stock-out").header("Authorization", bearer(m)),
                        Map.of("productId", p, "quantity", 1))).andReturn().getResponse().getStatus());
            }
            long ok = 0;
            for (Future<Integer> f : pool.invokeAll(tasks)) {
                if (f.get() == 200) {
                    ok++;
                }
            }
            assertThat(ok).isEqualTo(5);
            assertThat(quantityOf(m, p)).isZero();
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void dashboardAndOrderReportReflectActivity() throws Exception {
        String m = managerToken();
        long p = createProduct(m, "DASH-" + unique(), "10.00", "4.00", 3, 5);
        Customer c = registerCustomer();
        addToCart(c, p, 1);
        placeOrder(c);
        mvc.perform(get("/api/manager/dashboard").header("Authorization", bearer(m)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProducts").isNumber())
                .andExpect(jsonPath("$.recentMovements").isArray())
                .andExpect(jsonPath("$.recentOrders").isArray());
        mvc.perform(get("/api/reports/orders").header("Authorization", bearer(m)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.byStatus.length()").value(6));
    }
}
