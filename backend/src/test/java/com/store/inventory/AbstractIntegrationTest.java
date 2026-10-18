package com.store.inventory;

import com.jayway.jsonpath.JsonPath;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Boots the full application against a real PostgreSQL (Testcontainers) with Flyway migrations applied. */
@SpringBootTest(properties = {
        "app.jwt.secret=dGVzdC1zZWNyZXQtdGVzdC1zZWNyZXQtdGVzdC1zZWNyZXQtdGVzdC1zZWNyZXQ=",
        "app.refresh.cookie-secure=false",
        "app.bootstrap.manager-email=manager@test.local",
        "app.bootstrap.manager-password=Manager-Test-Pass-1",
        "app.login.max-attempts=5"
})
@AutoConfigureMockMvc
public abstract class AbstractIntegrationTest {

    public static final String MANAGER_EMAIL = "manager@test.local";
    public static final String MANAGER_PASSWORD = "Manager-Test-Pass-1";

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected ObjectMapper mapper;

    protected String json(Object o) {
        return mapper.writeValueAsString(o);
    }

    protected MockHttpServletRequestBuilder withBody(MockHttpServletRequestBuilder b, Object body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(json(body));
    }

    protected static String unique() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    protected String managerToken() throws Exception {
        MvcResult r = mvc.perform(withBody(post("/api/auth/login"),
                Map.of("email", MANAGER_EMAIL, "password", MANAGER_PASSWORD))).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.accessToken");
    }

    protected record Customer(String email, String token, long id) {}

    protected Customer registerCustomer() throws Exception {
        String email = "cust-" + unique() + "@test.local";
        MvcResult r = mvc.perform(withBody(post("/api/auth/register"),
                Map.of("fullName", "Test Customer", "email", email, "password", "Passw0rdOK"))).andReturn();
        String body = r.getResponse().getContentAsString();
        return new Customer(email, JsonPath.read(body, "$.accessToken"),
                ((Number) JsonPath.read(body, "$.user.id")).longValue());
    }

    protected long createProduct(String token, String sku, String price, String cost, int qty, int threshold)
            throws Exception {
        MvcResult r = mvc.perform(withBody(post("/api/products").header("Authorization", "Bearer " + token),
                Map.of("name", "Product " + sku, "sku", sku, "price", price, "costPrice", cost,
                        "initialQuantity", qty, "reorderThreshold", threshold))).andReturn();
        if (r.getResponse().getStatus() != 201) {
            throw new IllegalStateException("createProduct failed: " + r.getResponse().getContentAsString());
        }
        return ((Number) JsonPath.read(r.getResponse().getContentAsString(), "$.id")).longValue();
    }

    protected int quantityOf(String managerToken, long productId) throws Exception {
        MvcResult r = mvc.perform(get("/api/products/" + productId).header("Authorization", "Bearer " + managerToken))
                .andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.quantity");
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }
}
