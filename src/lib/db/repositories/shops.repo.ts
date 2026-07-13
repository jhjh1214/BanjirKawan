import { getPool } from "@/lib/db/client";

export interface ShopRow {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  state_code: string | null;
  nearest_station_id: string | null;
  language: string;
  telegram_chat_id: string | null;
  created_at: Date;
}

export interface CreateShopInput {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  stateCode?: string;
  nearestStationId?: string;
  language?: string;
  telegramChatId?: string;
}

export async function createShop(input: CreateShopInput): Promise<ShopRow> {
  const { rows } = await getPool().query<ShopRow>(
    `insert into shops (name, address, lat, lng, state_code, nearest_station_id, language, telegram_chat_id)
     values ($1, $2, $3, $4, $5, $6, coalesce($7, 'ms'), $8)
     returning *`,
    [
      input.name,
      input.address,
      input.lat ?? null,
      input.lng ?? null,
      input.stateCode ?? null,
      input.nearestStationId ?? null,
      input.language ?? null,
      input.telegramChatId ?? null,
    ]
  );
  return rows[0];
}

export async function getShop(id: string): Promise<ShopRow | null> {
  const { rows } = await getPool().query<ShopRow>("select * from shops where id = $1", [id]);
  return rows[0] ?? null;
}

export async function listShops(): Promise<ShopRow[]> {
  const { rows } = await getPool().query<ShopRow>("select * from shops order by created_at desc");
  return rows;
}

export async function listShopsByStation(stationId: string): Promise<ShopRow[]> {
  const { rows } = await getPool().query<ShopRow>(
    "select * from shops where nearest_station_id = $1",
    [stationId]
  );
  return rows;
}

export async function updateShopLocation(
  shopId: string,
  loc: { lat: number; lng: number; stateCode: string | null; nearestStationId: string | null }
): Promise<void> {
  await getPool().query(
    `update shops
     set lat = $2, lng = $3, state_code = $4, nearest_station_id = $5
     where id = $1`,
    [shopId, loc.lat, loc.lng, loc.stateCode, loc.nearestStationId]
  );
}

export async function setTelegramChatId(shopId: string, chatId: string): Promise<void> {
  await getPool().query("update shops set telegram_chat_id = $2 where id = $1", [shopId, chatId]);
}
