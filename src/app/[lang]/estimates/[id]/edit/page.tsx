"use client";

import { use } from "react";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { EstimateEditClient } from "./estimate-edit-client";

type RouteParams = {
  lang: string;
  id: string;
};

export default function EstimateEditPage(props: {
  params: Promise<RouteParams>;
}) {
  const { id } = use(props.params);

  return (
    <SalesFlowShell activeItem="estimates">
      <EstimateEditClient id={id} />
    </SalesFlowShell>
  );
}
