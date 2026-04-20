import { env } from "../../config/env.js";

type VerifyResponse = {
  success: boolean;
  message?: string;
  guid?: string;
};

type SendMailResponse = {
  success: boolean;
  message?: string;
};

export type ExternalItem = {
  id: string;
  name: string;
};

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data as T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data as T;
}

function buildItemsString(itemId: number, quantity: number): string {
  if (itemId >= 120000) {
    return `4:2:1,${itemId},${quantity},0,0;`;
  }
  return `4:2:${itemId},${quantity},0,0;`;
}

export async function fetchExternalItems(): Promise<ExternalItem[]> {
  const base = env.TICKET_MAIL_API_BASE_URL.replace(/\/$/, "");
  const url = `${base}/api/items`;
  const rows = await getJson<ExternalItem[]>(url);
  return rows ?? [];
}

export async function sendItemMailByRoleUid(roleUid: string, itemId: number, quantity: number): Promise<void> {
  const base = env.TICKET_MAIL_API_BASE_URL.replace(/\/$/, "");
  const verifyUrl = `${base}/api/verify`;
  const sendMailUrl = `${base}/api/send-mail`;

  const verify = await postJson<VerifyResponse>(verifyUrl, {
    verifyCode: env.TICKET_MAIL_VERIFY_CODE,
    roleId: roleUid,
  });
  if (!verify.success || !verify.guid) {
    throw new Error(verify.message || "Xác thực nhân vật thất bại");
  }

  const items = buildItemsString(itemId, quantity);
  const send = await postJson<SendMailResponse>(sendMailUrl, {
    guid: verify.guid,
    items,
  });
  if (!send.success) {
    throw new Error(send.message || "Gửi mail vật phẩm thất bại");
  }
}
