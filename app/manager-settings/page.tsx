"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyManagerSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/manager/settings");
  }, [router]);

  return null;
}
