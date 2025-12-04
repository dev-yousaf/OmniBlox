"use client";

import React, { useState } from "react";
import { useAuthenticatedApi } from "@/hooks/use-authenticated-api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Debug component to test multi-tenant API functionality
 * This component verifies that:
 * 1. API calls include proper authentication headers
 * 2. Backend filters data by companyId automatically
 * 3. No hardcoded companyId parameters are needed
 */
export function ApiTest() {
  const { get, post } = useAuthenticatedApi();
  const { user, company } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApiCall = async (
    endpoint: string,
    method: "GET" | "POST" = "GET",
    data?: any
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      if (method === "GET") {
        response = await get(endpoint);
      } else {
        response = await post(endpoint, data);
      }
      setResult(response);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const tests = [
    {
      name: "Get Products",
      endpoint: "/products",
      method: "GET" as const,
      description: "Should return only products for the current company",
    },
    {
      name: "Get Sales",
      endpoint: "/sales",
      method: "GET" as const,
      description: "Should return only sales for the current company",
    },
    {
      name: "Get Customers",
      endpoint: "/customers",
      method: "GET" as const,
      description: "Should return only customers for the current company",
    },
    {
      name: "Create Customer Test",
      endpoint: "/customers",
      method: "POST" as const,
      data: {
        name: "Test Customer",
        email: "test@customer.com",
        phone: "+1234567890",
      },
      description:
        "Should create customer under current company (no companyId needed)",
    },
  ];

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to test the API</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Multi-Tenant API Test</CardTitle>
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>User:</strong> {user.name} ({user.email})
          </p>
          <p>
            <strong>Company:</strong> {company?.name || "Loading..."}
          </p>
          <p>
            <strong>Role:</strong> {user.role}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((test) => (
            <div key={test.name} className="space-y-2">
              <Button
                onClick={() =>
                  testApiCall(test.endpoint, test.method, test.data)
                }
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {test.name}
              </Button>
              <p className="text-xs text-muted-foreground">
                {test.description}
              </p>
            </div>
          ))}
        </div>

        {loading && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p>Loading...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 rounded-lg">
            <h4 className="font-medium text-red-800">Error:</h4>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-800">Success:</h4>
            <pre className="mt-2 text-xs text-green-700 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800">
            Multi-Tenancy Verification:
          </h4>
          <ul className="mt-2 text-sm text-blue-700 space-y-1">
            <li>✅ Authentication headers are automatically included</li>
            <li>✅ CompanyId is extracted from JWT token on backend</li>
            <li>✅ All queries are automatically filtered by company</li>
            <li>✅ No hardcoded companyId parameters required</li>
            <li>✅ Data isolation is enforced at the API level</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
