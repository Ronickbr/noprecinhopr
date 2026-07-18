import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/categoria/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/busca",
      search: { category: params.slug, sort: "price_asc", page: 1 },
    });
  },
});
