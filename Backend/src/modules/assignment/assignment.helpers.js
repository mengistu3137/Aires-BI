// In Backend/src/modules/assignment/assignment.helpers.js
export const formatAssignmentResponse = (assignment) => {
    // Aggregate real observation count across audits for this assignment
    const totalObserved = (assignment.audits || []).reduce(
        (acc, audit) => acc + (audit._count?.observations || 0),
        0
    );

    return {
        id: assignment.id,
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        startedAt: assignment.startedAt,
        completedAt: assignment.completedAt,
        observedCount: totalObserved, // 100% real database count
        auditor: {
            id: assignment.auditor?.id,
            name: assignment.auditor?.name,
            phone: assignment.auditor?.phone,
            locationPermission: assignment.auditor?.locationPermission || "NOT_REQUESTED",
        },
        store: {
            id: assignment.store?.id,
            name: assignment.store?.name,
            address: assignment.store?.address,
            area: assignment.store?.area,
            type: assignment.store?.type,
            latitude: assignment.store?.latitude ? Number(assignment.store.latitude) : null,
            longitude: assignment.store?.longitude ? Number(assignment.store.longitude) : null,
            competitor: assignment.store?.competitor,
        },
        surveyPeriod: {
            id: assignment.surveyPeriod?.id,
            name: assignment.surveyPeriod?.name,
            status: assignment.surveyPeriod?.status,
            startDate: assignment.surveyPeriod?.startDate,
            endDate: assignment.surveyPeriod?.endDate,
        },
        totalItemsCount: assignment.items?.length || 0,
        items: (assignment.items || []).map((item) => ({
            id: item.id,
            productId: item.productId,
            name: item.product?.name,
            category: item.product?.category,
            unit: item.product?.unit,
            sku: item.product?.sku,
            barcode: item.product?.barcode,
            required: item.required,
        })),
        auditsCount: assignment.audits?.length || 0,
    };
};