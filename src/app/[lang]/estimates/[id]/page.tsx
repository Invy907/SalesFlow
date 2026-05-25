"use client";

import { use } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { EstimateDetailClient } from "./estimate-detail-client";

type RouteParams = {
  lang: string;
  id: string;
};

export default function EstimateDetailPage(props: {
  params: Promise<RouteParams>;
}) {
  const { id } = use(props.params);

  return (
    <SalesFlowShell activeItem="estimates">
      <EstimateDetailClient id={id} />
    </SalesFlowShell>
  );
}
