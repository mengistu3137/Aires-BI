import { useEffect, useState, useRef } from "react";
import { useAuth } from "./useAuth.js";
import { apiClient } from "@/services/client.js";

export function useLocationPermissionSync() {
    const { isAuthenticated, isAuditor } = useAuth();
    const [permissionStatus, setPermissionStatus] = useState("NOT_REQUESTED");
    const lastSyncedStatus = useRef(null);

    useEffect(() => {
        if (!isAuthenticated || !isAuditor || typeof window === "undefined" || !navigator.permissions) {
            return;
        }

        let isMounted = true;
        let permissionStatusObject = null;

        const syncWithBackend = async (status) => {
            if (lastSyncedStatus.current === status) return;
            lastSyncedStatus.current = status;

            try {
                await apiClient.patch("/users/me/location-permission", { status });
            } catch (err) {
                console.warn("Location permission sync to backend failed:", err.message);
            }
        };

        const mapPermissionState = (state) => {
            switch (state) {
                case "granted":
                    return "GRANTED";
                case "denied":
                    return "DENIED";
                case "prompt":
                default:
                    return "PROMPT";
            }
        };

        // Query browser Permissions API
        navigator.permissions
            .query({ name: "geolocation" })
            .then((permission) => {
                if (!isMounted) return;
                permissionStatusObject = permission;

                const currentStatus = mapPermissionState(permission.state);
                setPermissionStatus(currentStatus);
                syncWithBackend(currentStatus);

                // Listen for live browser permission changes (e.g. user taps 'Allow' or 'Block')
                permission.onchange = () => {
                    if (!isMounted) return;
                    const updated = mapPermissionState(permission.state);
                    setPermissionStatus(updated);
                    syncWithBackend(updated);
                };
            })
            .catch(() => {
                if (isMounted) setPermissionStatus("NOT_REQUESTED");
            });

        return () => {
            isMounted = false;
            if (permissionStatusObject) {
                permissionStatusObject.onchange = null;
            }
        };
    }, [isAuthenticated, isAuditor]);

    return permissionStatus;
}