package com.store.inventory.user;

public enum Role {
    STORE_MANAGER,
    CUSTOMER;

    public String authority() {
        return "ROLE_" + name();
    }
}
