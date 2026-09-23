import { useEffect, useState } from "react";
import { useAuth } from "./useAuth.js";
import { apiClient } from "@/services/client.js";

export function useLocationPermissionSync() {
    const { isAuthenticated, isAuditor } = useAuth();
    const [permissionStatus, setPermissionStatus] = useState("NOT_REQUESTED");

    useEffect(() => {
        if (!isAuthenticated || typeof window === "undefined" || !navigator.permissions) {
            return;
        }

        let isMounted = true;
        let permissionObject = null;

        const syncWithBackend = async (status) => {
            try {
                await apiClient.patch("/users/me/location-permission", { status });
            } catch {
                // Silent failure in background sync
            }
        };

        const mapPermissionState = (state) => {
            switch (state) {
                case "granted":
                    return "ALLOWED";
                case "denied":
                    return "DENIED";
                case "prompt":
                default:
                    return "PROMPT";
            }
        };

        navigator.permissions
            .query({ name: "geolocation" })
            .then((permission) => {
                if (!isMounted) return;
                permissionObject = permission;

                const currentStatus = mapPermissionState(permission.state);
                setPermissionStatus(currentStatus);
                syncWithBackend(currentStatus);

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
            if (permissionObject) {
                permissionObject.onchange = null;
            }
        };
    }, [isAuthenticated, isAuditor]);

    return permissionStatus;
}