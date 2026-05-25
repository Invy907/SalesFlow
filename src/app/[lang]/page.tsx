"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SalesFlowShell } from "@/components/salesflow-shell";
import { useLanguage, type AppLocale } from "@/contexts/language-context";

const cardTones = [
  "from-cyan-500/15 to-cyan-500/0",
  "from-amber-500/20 to-amber-500/0",
  "from-slate-900/10 to-slate-900/0",
];

const actionIcons = [
  <DocumentIcon key="document" />,
  <DeliveryIcon key="delivery" />,
  <InvoiceIcon key="invoice" />,
  <BriefcaseIcon key="briefcase" />,
  <PeopleIcon key="people" />,
  <GridIcon key="grid" />,
];

const copy: Record<AppLocale, any> = {
  ja: {
    hero: {
      eyebrow: "HOME DASHBOARD",
      title: "\u66f8\u985e\u4f5c\u6210\u304b\u3089\u5165\u91d1\u78ba\u8a8d\u307e\u3067\u3001\u3072\u3068\u3064\u306e\u753b\u9762\u3067",
      description:
        "\u898b\u7a4d\u66f8\u30fb\u7d0d\u54c1\u66f8\u30fb\u8acb\u6c42\u66f8\u30fb\u9818\u53ce\u66f8\u306e\u4f5c\u6210\u304b\u3089\u3001\u9001\u4ed8\u72b6\u6cc1\u3084\u5165\u91d1\u78ba\u8a8d\u307e\u3067\u3001\u65e5\u3005\u306e\u8acb\u6c42\u696d\u52d9\u3092SalesFlow\u3067\u307e\u3068\u3081\u3066\u7ba1\u7406\u3067\u304d\u307e\u3059\u3002",
      primaryCta: "\u65b0\u898f\u4f5c\u6210",
      secondaryCta: "\u30b5\u30f3\u30d7\u30eb\u8acb\u6c42\u66f8\u3092\u898b\u308b",
      createMenu: [
        "\u898b\u7a4d\u66f8\u3092\u4f5c\u6210",
        "\u7d0d\u54c1\u66f8\u3092\u4f5c\u6210",
        "\u8acb\u6c42\u66f8\u3092\u4f5c\u6210",
        "\u9818\u53ce\u66f8\u3092\u4f5c\u6210",
      ],
    },
    summary: {
      badge: "\u512a\u5148",
      title: "\u672a\u51e6\u7406\u306e\u8acb\u6c42\u30fb\u5165\u91d1\u5f85\u3061\u3092\u3059\u3050\u78ba\u8a8d\u3067\u304d\u307e\u3059",
      description:
        "\u4eca\u9031\u304c\u671f\u9650\u306e\u8acb\u6c42\u66f8\u3001\u672a\u9001\u4ed8\u306e\u898b\u7a4d\u66f8\u3001\u5165\u91d1\u78ba\u8a8d\u304c\u5fc5\u8981\u306a\u6848\u4ef6\u3092\u512a\u5148\u5ea6\u9806\u306b\u307e\u3068\u3081\u307e\u3057\u305f\u3002",
      cards: [
        { label: "\u4eca\u6708\u306e\u8acb\u6c42\u984d", value: "\u00a51,280,000" },
        { label: "\u672a\u5165\u91d1", value: "\u00a5824,000" },
        { label: "\u672a\u51e6\u7406", value: "6\u4ef6" },
      ],
    },
    quickActions: {
      title: "\u30af\u30a4\u30c3\u30af\u30a2\u30af\u30b7\u30e7\u30f3",
      description:
        "\u3088\u304f\u4f7f\u3046\u66f8\u985e\u4f5c\u6210\u3068\u7ba1\u7406\u30e1\u30cb\u30e5\u30fc\u306b\u3059\u3050\u79fb\u52d5\u3067\u304d\u307e\u3059\u3002",
      cta: "\u3059\u3079\u3066\u898b\u308b",
      items: [
        {
          title: "\u898b\u7a4d\u66f8",
          description: "\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u304b\u3089\u6570\u5206\u3067\u4f5c\u6210",
          metric: "\u4eca\u6708 14\u4ef6",
          href: "/ja/estimates",
          action: "\u4f5c\u6210\u3059\u308b",
        },
        {
          title: "\u7d0d\u54c1\u66f8",
          description: "\u898b\u7a4d\u66f8\u30c7\u30fc\u30bf\u304b\u3089\u3059\u3050\u5909\u63db",
          metric: "\u672a\u9001\u4ed8 3\u4ef6",
          href: "/ja/delivery-notes",
          action: "\u4f5c\u6210\u3059\u308b",
        },
        {
          title: "\u8acb\u6c42\u66f8",
          description: "\u7a0e\u7387\u3068\u652f\u6255\u671f\u9650\u3092\u81ea\u52d5\u6574\u7406",
          metric: "\u672a\u5165\u91d1 \u00a5824,000",
          href: "/ja/invoices",
          action: "\u4f5c\u6210\u3059\u308b",
        },
        {
          title: "\u53d7\u6ce8\u7ba1\u7406",
          description: "\u6848\u4ef6\u3054\u3068\u306e\u9032\u6357\u3068\u91d1\u984d\u3092\u78ba\u8a8d",
          metric: "\u9032\u884c\u4e2d 8\u4ef6",
          href: "#",
          action: "\u78ba\u8a8d\u3059\u308b",
        },
        {
          title: "\u53d6\u5f15\u5148",
          description: "\u9023\u7d61\u5148\u3068\u652f\u6255\u6761\u4ef6\u3092\u307e\u3068\u3081\u3066\u7ba1\u7406",
          metric: "\u767b\u9332 42\u4ef6",
          href: "#",
          action: "\u767b\u9332\u3059\u308b",
        },
        {
          title: "\u54c1\u76ee\u7ba1\u7406",
          description: "\u3088\u304f\u4f7f\u3046\u4f5c\u696d\u9805\u76ee\u3092\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u5316",
          metric: "\u54c1\u76ee 27\u4ef6",
          href: "#",
          action: "\u7ba1\u7406\u3059\u308b",
        },
      ],
    },
    timeline: {
      title: "\u6700\u8fd1\u306e\u66f8\u985e\u30d5\u30ed\u30fc",
      description:
        "\u53d6\u5f15\u5148\u3054\u3068\u306e\u9001\u4ed8\u72b6\u6cc1\u3068\u5165\u91d1\u4e88\u5b9a\u65e5\u3092\u3059\u3050\u78ba\u8a8d\u3067\u304d\u307e\u3059\u3002",
      badge: "\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0",
      duePrefix: "\u5165\u91d1\u4e88\u5b9a",
      items: [
        {
          client: "Kumo Design\u682a\u5f0f\u4f1a\u793e",
          amount: "\u00a5220,000",
          status: "\u9001\u4ed8\u6e08\u307f",
          due: "5\u670828\u65e5",
        },
        {
          client: "Aster Studio",
          amount: "\u00a5148,000",
          status: "\u4e0b\u66f8\u304d",
          due: "5\u670824\u65e5",
        },
        {
          client: "Northwind\u5408\u540c\u4f1a\u793e",
          amount: "\u00a5456,000",
          status: "\u5165\u91d1\u5f85\u3061",
          due: "5\u670831\u65e5",
        },
      ],
    },
    tips: {
      eyebrow: "\u696d\u52d9\u306e\u30b3\u30c4",
      title: "\u8acb\u6c42\u696d\u52d9\u3092\u65e9\u304f\u3059\u308b\u5c0f\u3055\u306a\u5de5\u592b",
      items: [
        "\u898b\u7a4d\u66f8\u304b\u3089\u7d0d\u54c1\u66f8\u30fb\u8acb\u6c42\u66f8\u3078\u5909\u63db\u3057\u3066\u5165\u529b\u306e\u624b\u9593\u3092\u6e1b\u3089\u3059",
        "\u53d6\u5f15\u5148\u3054\u3068\u306b\u652f\u6255\u671f\u9650\u3084\u656c\u79f0\u3092\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u5316\u3059\u308b",
        "PDF\u4f5c\u6210\u304b\u3089\u30e1\u30fc\u30eb\u9001\u4ed8\u307e\u3067\u540c\u3058\u753b\u9762\u3067\u5b8c\u4e86\u3055\u305b\u308b",
        "\u672a\u5165\u91d1\u306e\u6848\u4ef6\u3060\u3051\u3092\u512a\u5148\u8868\u793a\u3057\u3066\u56de\u53ce\u6f0f\u308c\u3092\u9632\u3050",
      ],
    },
    guide: {
      title: "\u521d\u671f\u8a2d\u5b9a\u30ac\u30a4\u30c9",
      description: "\u307e\u305a\u306f\u3053\u3053\u304b\u3089\u59cb\u3081\u307e\u3057\u3087\u3046",
      steps: [
        "\u4f1a\u793e\u60c5\u5831\u3092\u767b\u9332",
        "\u53d6\u5f15\u5148\u3092\u8ffd\u52a0",
        "\u54c1\u76ee\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u3092\u4f5c\u6210",
      ],
    },
    notices: {
      title: "\u304a\u77e5\u3089\u305b",
      cta: "\u3082\u3063\u3068\u898b\u308b",
      items: [
        {
          title: "\u8acb\u6c42\u66f8\u30e1\u30fc\u30eb\u9001\u4ed8\u753b\u9762\u306eUI\u3092\u66f4\u65b0\u3057\u307e\u3057\u305f",
          date: "2026.05.20",
          category: "\u30a2\u30c3\u30d7\u30c7\u30fc\u30c8",
        },
        {
          title: "\u30a4\u30f3\u30dc\u30a4\u30b9\u5236\u5ea6\u5411\u3051\u306e\u7a0e\u7387\u8868\u793a\u3092\u6539\u5584\u3057\u307e\u3057\u305f",
          date: "2026.05.12",
          category: "\u6cd5\u5bfe\u5fdc",
        },
        {
          title: "\u5b9a\u671f\u8acb\u6c42\u66f8\u306e\u4e0b\u66f8\u304d\u4fdd\u5b58\u306b\u5bfe\u5fdc\u3057\u307e\u3057\u305f",
          date: "2026.04.28",
          category: "\u65b0\u6a5f\u80fd",
        },
      ],
    },
    smartAction: {
      eyebrow: "\u304a\u3059\u3059\u3081\u6a5f\u80fd",
      title: "\u7763\u4fc3\u30e1\u30fc\u30eb\u306e\u81ea\u52d5\u5316\u306b\u3082\u5e83\u3052\u3089\u308c\u307e\u3059",
      description:
        "SalesFlow\u306e\u9001\u4ed8\u72b6\u6cc1\u3068\u5165\u91d1\u72b6\u6cc1\u3092\u9023\u643a\u3059\u308c\u3070\u3001\u767a\u884c\u65e5\u3084\u652f\u6255\u671f\u9650\u3092\u3082\u3068\u306b\u7763\u4fc3\u30d5\u30ed\u30fc\u3082\u81ea\u7136\u306b\u62e1\u5f35\u3067\u304d\u307e\u3059\u3002",
      cta: "\u9023\u643a\u30a4\u30e1\u30fc\u30b8\u3092\u898b\u308b",
    },
  },
  ko: {
    hero: {
      eyebrow: "HOME DASHBOARD",
      title: "\uc11c\ub958 \uc791\uc131\ubd80\ud130 \uc785\uae08 \ud655\uc778\uae4c\uc9c0, \ud55c \ud654\uba74\uc5d0\uc11c",
      description:
        "\uacac\uc801\uc11c, \ub0a9\ud488\uc11c, \uccad\uad6c\uc11c, \uc601\uc218\uc99d \uc791\uc131\ubd80\ud130 \ubc1c\uc1a1 \uc0c1\ud0dc\uc640 \uc785\uae08 \ud655\uc778\uae4c\uc9c0, \uc77c\uc0c1\uc801\uc778 \uccad\uad6c \uc5c5\ubb34\ub97c SalesFlow\uc5d0\uc11c \ud55c\ubc88\uc5d0 \uad00\ub9ac\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
      primaryCta: "\uc0c8\ub85c \ub9cc\ub4e4\uae30",
      secondaryCta: "\uc0d8\ud50c \uccad\uad6c\uc11c \ubcf4\uae30",
      createMenu: [
        "\uacac\uc801\uc11c \ub9cc\ub4e4\uae30",
        "\ub0a9\ud488\uc11c \ub9cc\ub4e4\uae30",
        "\uccad\uad6c\uc11c \ub9cc\ub4e4\uae30",
        "\uc601\uc218\uc99d \ub9cc\ub4e4\uae30",
      ],
    },
    summary: {
      badge: "\uc6b0\uc120",
      title: "\ubbf8\ucc98\ub9ac \uccad\uad6c\uc640 \uc785\uae08 \ub300\uae30\ub97c \ubc14\ub85c \ud655\uc778\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4",
      description:
        "\uc774\ubc88 \uc8fc \ub9c8\uac10 \uccad\uad6c\uc11c, \ubbf8\ubc1c\uc1a1 \uacac\uc801\uc11c, \uc785\uae08 \ud655\uc778\uc774 \ud544\uc694\ud55c \uac74\uc744 \uc6b0\uc120\uc21c\uc704\ub85c \uc815\ub9ac\ud588\uc2b5\ub2c8\ub2e4.",
      cards: [
        { label: "\uc774\ubc88 \ub2ec \uccad\uad6c\uc561", value: "\u00a51,280,000" },
        { label: "\ubbf8\uc785\uae08", value: "\u00a5824,000" },
        { label: "\ubbf8\ucc98\ub9ac", value: "6\uac74" },
      ],
    },
    quickActions: {
      title: "\ube60\ub978 \uc791\uc5c5",
      description:
        "\uc790\uc8fc \uc4f0\ub294 \ubb38\uc11c \uc791\uc131\uacfc \uad00\ub9ac \uba54\ub274\ub85c \ubc14\ub85c \uc774\ub3d9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
      cta: "\uc804\uccb4 \ubcf4\uae30",
      items: [
        { title: "\uacac\uc801\uc11c", description: "\ud15c\ud50c\ub9bf\uc73c\ub85c \ube60\ub974\uac8c \uc791\uc131", metric: "\uc774\ubc88 \ub2ec 14\uac74", href: "/ja/estimates", action: "\uc791\uc131\ud558\uae30" },
        { title: "\ub0a9\ud488\uc11c", description: "\uacac\uc801\uc11c \ub370\uc774\ud130\uc5d0\uc11c \ubc14\ub85c \ubcc0\ud658", metric: "\ubbf8\ubc1c\uc1a1 3\uac74", href: "/ja/delivery-notes", action: "\uc791\uc131\ud558\uae30" },
        { title: "\uccad\uad6c\uc11c", description: "\uc138\uc728\uacfc \uc9c0\uae09\uae30\ud55c\uc744 \uc790\ub3d9 \uc815\ub9ac", metric: "\ubbf8\uc785\uae08 \u00a5824,000", href: "/ja/invoices", action: "\uc791\uc131\ud558\uae30" },
        { title: "\uc218\uc8fc \uad00\ub9ac", description: "\uc9c4\ud589 \uc0c1\ud669\uacfc \uae08\uc561\uc744 \ud568\uaed8 \ud655\uc778", metric: "\uc9c4\ud589 \uc911 8\uac74", href: "#", action: "\ud655\uc778\ud558\uae30" },
        { title: "\uac70\ub798\ucc98", description: "\uc5f0\ub77d\ucc98\uc640 \uc9c0\uae09 \uc870\uac74\uc744 \ud568\uaed8 \uad00\ub9ac", metric: "\ub4f1\ub85d 42\uac74", href: "#", action: "\ub4f1\ub85d\ud558\uae30" },
        { title: "\ud488\ubaa9 \uad00\ub9ac", description: "\uc790\uc8fc \uc4f0\ub294 \ud56d\ubaa9\uc744 \ud15c\ud50c\ub9bf\ud654", metric: "\ud488\ubaa9 27\uac74", href: "#", action: "\uad00\ub9ac\ud558\uae30" },
      ],
    },
    timeline: {
      title: "\ucd5c\uadfc \ubb38\uc11c \ud750\ub984",
      description: "\uac70\ub798\ucc98\ubcc4 \ubc1c\uc1a1 \uc0c1\ud0dc\uc640 \uc785\uae08 \uc608\uc815\uc77c\uc744 \ube60\ub974\uac8c \ud655\uc778\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
      badge: "\uc2e4\uc2dc\uac04",
      duePrefix: "\uc785\uae08 \uc608\uc815",
      items: [
        { client: "Kumo Design", amount: "\u00a5220,000", status: "\ubc1c\uc1a1 \uc644\ub8cc", due: "5\uc6d4 28\uc77c" },
        { client: "Aster Studio", amount: "\u00a5148,000", status: "\ucd08\uc548", due: "5\uc6d4 24\uc77c" },
        { client: "Northwind", amount: "\u00a5456,000", status: "\uc785\uae08 \ub300\uae30", due: "5\uc6d4 31\uc77c" },
      ],
    },
    tips: {
      eyebrow: "\uc5c5\ubb34 \ud301",
      title: "\uccad\uad6c \uc5c5\ubb34\ub97c \ub354 \ube60\ub974\uac8c \ub9cc\ub4dc\ub294 \uc2b5\uad00",
      items: [
        "\uacac\uc801\uc11c\ub97c \ub0a9\ud488\uc11c\uc640 \uccad\uad6c\uc11c\ub85c \ubc14\ub85c \uc804\ud658\ud574 \uc785\ub825 \uc2dc\uac04\uc744 \uc904\uc785\ub2c8\ub2e4.",
        "\uac70\ub798\ucc98\ubcc4 \uacb0\uc81c\uae30\ud55c\uacfc \ud638\uce6d\uc744 \ud15c\ud50c\ub9bf\uc73c\ub85c \uc800\uc7a5\ud569\ub2c8\ub2e4.",
        "PDF \uc0dd\uc131\ubd80\ud130 \uba54\uc77c \ubc1c\uc1a1\uae4c\uc9c0 \ud55c \ud654\uba74\uc5d0\uc11c \ub05d\ub0c5\ub2c8\ub2e4.",
        "\ubbf8\uc785\uae08 \uac74\ub9cc \uc6b0\uc120 \ud45c\uc2dc\ud574 \ud68c\uc218 \ub204\ub77d\uc744 \uc904\uc785\ub2c8\ub2e4.",
      ],
    },
    guide: {
      title: "\ucd08\uae30 \uc124\uc815 \uac00\uc774\ub4dc",
      description: "\uba3c\uc800 \uc774\uac83\ubd80\ud130 \uc2dc\uc791\ud558\uc138\uc694",
      steps: ["\ud68c\uc0ac \uc815\ubcf4 \ub4f1\ub85d", "\uac70\ub798\ucc98 \ucd94\uac00", "\ud488\ubaa9 \ud15c\ud50c\ub9bf \ub9cc\ub4e4\uae30"],
    },
    notices: {
      title: "\uacf5\uc9c0\uc0ac\ud56d",
      cta: "\ub354 \ubcf4\uae30",
      items: [
        { title: "\uccad\uad6c\uc11c \uba54\uc77c \ubc1c\uc1a1 \ud654\uba74 UI\ub97c \uc5c5\ub370\uc774\ud2b8\ud588\uc2b5\ub2c8\ub2e4", date: "2026.05.20", category: "\uc5c5\ub370\uc774\ud2b8" },
        { title: "\uc77c\ubcf8 \uc778\ubcf4\uc774\uc2a4 \uc81c\ub3c4\uc6a9 \uc138\uc728 \ud45c\uc2dc\ub97c \uac1c\uc120\ud588\uc2b5\ub2c8\ub2e4", date: "2026.05.12", category: "\ubc95\uaddc \ub300\uc751" },
        { title: "\uc815\uae30 \uccad\uad6c\uc11c \ucd08\uc548 \uc800\uc7a5\uc744 \uc9c0\uc6d0\ud569\ub2c8\ub2e4", date: "2026.04.28", category: "\uc2e0\uae30\ub2a5" },
      ],
    },
    smartAction: {
      eyebrow: "\ucd94\ucc9c \uae30\ub2a5",
      title: "\ub3c5\ucd09 \uba54\uc77c \uc790\ub3d9\ud654\uae4c\uc9c0 \ud655\uc7a5\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4",
      description:
        "SalesFlow\uc758 \ubc1c\uc1a1 \uc0c1\ud0dc\uc640 \uc785\uae08 \uc0c1\ud0dc\ub97c \uc5f0\ub3d9\ud558\uba74 \ubc1c\ud589\uc77c\uacfc \uacb0\uc81c\uae30\ud55c\uc744 \uae30\uc900\uc73c\ub85c \ub3c5\ucd09 \ud50c\ub85c\uc6b0\uae4c\uc9c0 \uc790\uc5f0\uc2a4\ub7fd\uac8c \ud655\uc7a5\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
      cta: "\uc5f0\ub3d9 \uc608\uc2dc \ubcf4\uae30",
    },
  },
  en: {
    hero: {
      eyebrow: "HOME DASHBOARD",
      title: "From document creation to payment tracking, all in one view",
      description:
        "Create estimates, delivery notes, invoices, and receipts, then check sending status and payment confirmation in the same workflow.",
      primaryCta: "Create New",
      secondaryCta: "View Sample Invoice",
      createMenu: ["Create estimate", "Create delivery note", "Create invoice", "Create receipt"],
    },
    summary: {
      badge: "Priority",
      title: "See pending billing and unpaid items right away",
      description:
        "This week's due invoices, unsent estimates, and items waiting for payment are grouped by priority.",
      cards: [
        { label: "Billed this month", value: "\u00a51,280,000" },
        { label: "Awaiting payment", value: "\u00a5824,000" },
        { label: "Pending", value: "6 items" },
      ],
    },
    quickActions: {
      title: "Quick Actions",
      description: "Jump into the documents and menus you use most often.",
      cta: "View all",
      items: [
        { title: "Estimate", description: "Create from a template in minutes", metric: "14 this month", href: "/ja/estimates", action: "Create" },
        { title: "Delivery Note", description: "Convert from estimate data instantly", metric: "3 unsent", href: "/ja/delivery-notes", action: "Create" },
        { title: "Invoice", description: "Auto-sort tax rates and due dates", metric: "Awaiting payment \u00a5824,000", href: "/ja/invoices", action: "Create" },
        { title: "Order Management", description: "Track project progress and amounts", metric: "8 active", href: "#", action: "Review" },
        { title: "Clients", description: "Manage contacts and payment terms together", metric: "42 registered", href: "#", action: "Register" },
        { title: "Item Management", description: "Save reusable work item templates", metric: "27 items", href: "#", action: "Manage" },
      ],
    },
    timeline: {
      title: "Recent document flow",
      description: "Check sending status and payment dates by client at a glance.",
      badge: "Realtime",
      duePrefix: "Due",
      items: [
        { client: "Kumo Design LLC", amount: "\u00a5220,000", status: "Sent", due: "May 28" },
        { client: "Aster Studio", amount: "\u00a5148,000", status: "Draft", due: "May 24" },
        { client: "Northwind Inc.", amount: "\u00a5456,000", status: "Awaiting payment", due: "May 31" },
      ],
    },
    tips: {
      eyebrow: "Work Tips",
      title: "Small habits that speed up invoicing",
      items: [
        "Convert estimates into delivery notes and invoices to reduce manual input.",
        "Template due dates and honorific settings per client.",
        "Finish PDF generation and email sending from one screen.",
        "Prioritize unpaid items to reduce missed collections.",
      ],
    },
    guide: {
      title: "Initial Setup Guide",
      description: "Start here first",
      steps: ["Register company info", "Add clients", "Create item templates"],
    },
    notices: {
      title: "Announcements",
      cta: "See more",
      items: [
        { title: "Updated the invoice email sending UI", date: "2026.05.20", category: "Update" },
        { title: "Improved tax rate display for Japan invoice compliance", date: "2026.05.12", category: "Compliance" },
        { title: "Draft saving is now available for recurring invoices", date: "2026.04.28", category: "New Feature" },
      ],
    },
    smartAction: {
      eyebrow: "Recommended",
      title: "You can extend this into reminder automation too",
      description:
        "By linking sending status and payment status, SalesFlow can naturally expand into reminder workflows based on issue date and due date.",
      cta: "See integration ideas",
    },
  },
};

export default function Home() {
  const { lang } = useLanguage();
  const ui = copy[lang] ?? copy.ja;
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (createMenuRef.current && !createMenuRef.current.contains(target)) {
        setCreateMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SalesFlowShell activeItem="home">
      <section className="bg-[radial-gradient(circle_at_top_left,_rgba(110,231,255,0.18),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#eef4f8_100%)] px-4 py-3 sm:px-6 lg:px-7 lg:py-4">
        <div className="mx-auto max-w-[1440px]">
          <div className="rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-[0_24px_64px_rgba(15,23,42,0.07)] backdrop-blur sm:p-5 lg:p-6">
            <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <p className="text-sm font-semibold tracking-[0.24em] text-cyan-700">
                  {ui.hero.eyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {ui.hero.title}
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  {ui.hero.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <div ref={createMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setCreateMenuOpen((open) => !open)}
                    className="min-w-[148px] rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
                  >
                    {ui.hero.primaryCta}
                  </button>

                  {createMenuOpen ? (
                    <div className="absolute right-0 top-[56px] z-20 min-w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_48px_rgba(15,23,42,0.14)]">
                      {ui.hero.createMenu.map((item: string) => (
                        <button
                          key={item}
                          type="button"
                          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <span>{item}</span>
                          <span aria-hidden="true" className="text-slate-400">
                            →
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <button className="min-w-[190px] rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold whitespace-nowrap text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                  {ui.hero.secondaryCta}
                </button>
              </div>
            </header>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_360px]">
              <div className="space-y-5">
                <section className="overflow-hidden rounded-[28px] border border-cyan-100 bg-linear-to-r from-cyan-50 via-white to-amber-50 p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                      <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
                        {ui.summary.badge}
                      </span>
                      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                        {ui.summary.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {ui.summary.description}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[470px]">
                      {ui.summary.cards.map((item: { label: string; value: string }, index: number) => (
                        <div
                          key={item.label}
                          className={`rounded-2xl border border-white/80 bg-linear-to-br ${cardTones[index]} p-4 shadow-sm`}
                        >
                          <p className="text-xs font-medium tracking-[0.18em] text-slate-500">
                            {item.label}
                          </p>
                          <p className="mt-3 text-xl font-semibold text-slate-950">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-950">
                        {ui.quickActions.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {ui.quickActions.description}
                      </p>
                    </div>
                    <a href="#" className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-800">
                      {ui.quickActions.cta}
                    </a>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {ui.quickActions.items.map(
                      (
                        action: {
                          title: string;
                          description: string;
                          metric: string;
                          href: string;
                          action: string;
                        },
                        index: number,
                      ) => (
                        <Link
                          key={action.title}
                          href={action.href}
                          className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_15px_40px_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_24px_50px_rgba(14,165,233,0.14)]"
                        >
                          <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 transition group-hover:bg-cyan-500 group-hover:text-white">
                            {actionIcons[index]}
                          </div>
                          <h4 className="mt-4 text-xl font-semibold text-slate-950">{action.title}</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                          <div className="mt-4 flex items-end justify-between gap-4">
                            <p className="text-sm font-semibold text-slate-500">{action.metric}</p>
                            <span className="text-sm font-semibold text-cyan-700 transition group-hover:translate-x-0.5">
                              {action.action} {"→"}
                            </span>
                          </div>
                        </Link>
                      ),
                    )}
                  </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-950">{ui.timeline.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{ui.timeline.description}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {ui.timeline.badge}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      {ui.timeline.items.map(
                        (item: { client: string; amount: string; status: string; due: string }) => (
                          <div
                            key={item.client}
                            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">{item.client}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {ui.timeline.duePrefix} {item.due}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-slate-950">{item.amount}</span>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white">
                    <p className="text-sm font-semibold tracking-[0.22em] text-cyan-200/80">{ui.tips.eyebrow}</p>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight">{ui.tips.title}</h3>
                    <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                      {ui.tips.items.map((tip: string) => (
                        <li
                          key={tip}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                        >
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
                <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                      <SparkIcon />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{ui.guide.title}</h3>
                      <p className="text-sm text-slate-500">{ui.guide.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {ui.guide.steps.map((step: string, index: number) => (
                      <div
                        key={step}
                        className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                          {index + 1}
                        </div>
                        <p className="text-sm font-medium text-slate-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-950">{ui.notices.title}</h3>
                    <a href="#" className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-800">
                      {ui.notices.cta}
                    </a>
                  </div>
                  <div className="mt-4 space-y-3">
                    {ui.notices.items.map((notice: { title: string; date: string; category: string }) => (
                      <article key={notice.title} className="rounded-2xl border border-slate-100 p-3.5">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                            {notice.category}
                          </span>
                          <span className="text-xs font-medium text-slate-400">{notice.date}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">{notice.title}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-cyan-100 bg-linear-to-br from-cyan-500 to-sky-600 p-5 text-white shadow-[0_20px_50px_rgba(14,165,233,0.25)]">
                  <p className="text-sm font-semibold tracking-[0.18em] text-cyan-50/80">{ui.smartAction.eyebrow}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">{ui.smartAction.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-cyan-50/90">{ui.smartAction.description}</p>
                  <button className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50">
                    {ui.smartAction.cta}
                  </button>
                </section>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </SalesFlowShell>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-current">
      <path
        d="M8 3.75h5.5L19.25 9.5v10.75A1.75 1.75 0 0 1 17.5 22H8A1.75 1.75 0 0 1 6.25 20.25V5.5A1.75 1.75 0 0 1 8 3.75Z"
        strokeWidth="1.7"
      />
      <path d="M13 3.75v5.5h5.5" strokeWidth="1.7" />
      <path d="M9.25 13h5.5M9.25 16.5h5.5" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function DeliveryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-current">
      <path d="M4.75 7.75h9.5v8.5h-9.5z" strokeWidth="1.7" />
      <path d="M14.25 10.25h3l2 2v4h-5z" strokeWidth="1.7" />
      <path
        d="M8 18.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm9 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-current">
      <path
        d="M7.75 3.75h8.5A1.75 1.75 0 0 1 18 5.5v13l-3-1.75-3 1.75-3-1.75-3 1.75v-13a1.75 1.75 0 0 1 1.75-1.75Z"
        strokeWidth="1.7"
      />
      <path d="M9 8.75h6M9 12h6" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-current">
      <path
        d="M8 6.25V5.5A1.75 1.75 0 0 1 9.75 3.75h4.5A1.75 1.75 0 0 1 16 5.5v.75"
        strokeWidth="1.7"
      />
      <path
        d="M4.75 8.25h14.5v9.5A1.75 1.75 0 0 1 17.5 19.5h-11A1.75 1.75 0 0 1 4.75 17.75v-9.5Z"
        strokeWidth="1.7"
      />
      <path
        d="M4.75 11.75a27.8 27.8 0 0 0 14.5 0"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-current">
      <path
        d="M8.5 11a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Zm7 1.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        strokeWidth="1.7"
      />
      <path
        d="M4.75 18.75a3.75 3.75 0 0 1 7.5 0M13 18.75a3.25 3.25 0 0 1 6.25-1.25"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-current">
      <path
        d="M4.75 4.75h6.5v6.5h-6.5zM12.75 4.75h6.5v6.5h-6.5zM4.75 12.75h6.5v6.5h-6.5zM12.75 12.75h6.5v6.5h-6.5z"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-current">
      <path
        d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
