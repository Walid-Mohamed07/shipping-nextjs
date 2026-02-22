import { ApiDocsContent } from "./ApiDocsContent";

// ISR - Revalidate API docs hourly (mostly static content)
export const revalidate = 3600;

export default function SwaggerPage() {
  return <ApiDocsContent />;
}
