"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function SwaggerPage() {
  return (
    <div style={{ padding: "20px" }}>
      <SwaggerUI url="/api/api-docs" />
    </div>
  );
}
