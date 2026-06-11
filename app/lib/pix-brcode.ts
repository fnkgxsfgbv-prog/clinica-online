/** Gera payload Pix copia-e-cola (EMV BR Code) para chave estática. */

function crc16CcittFalse(payload: string): string {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function normalizarAscii(texto: string, max: number): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\w\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .toUpperCase();
}

export type PixCopiaColaParams = {
  chave: string;
  valor?: number;
  nomeRecebedor: string;
  cidade: string;
  txid?: string;
};

export function gerarPixCopiaCola(params: PixCopiaColaParams): string {
  const chave = params.chave.trim();
  if (!chave) {
    throw new Error("Informe a chave Pix.");
  }

  const nome = normalizarAscii(params.nomeRecebedor || "RECEBEDOR", 25);
  const cidade = normalizarAscii(params.cidade || "BRASIL", 15);
  const txid = normalizarAscii(params.txid || "PSICODESK", 25).replace(/\s/g, "");

  const merchantAccount =
    tlv("00", "br.gov.bcb.pix") + tlv("01", chave);

  let payload = "";
  payload += tlv("00", "01");
  payload += tlv("26", merchantAccount);
  payload += tlv("52", "0000");
  payload += tlv("53", "986");

  if (params.valor != null && params.valor > 0) {
    payload += tlv("54", params.valor.toFixed(2));
  }

  payload += tlv("58", "BR");
  payload += tlv("59", nome);
  payload += tlv("60", cidade);
  payload += tlv("62", tlv("05", txid));

  const semCrc = `${payload}6304`;
  return semCrc + crc16CcittFalse(semCrc);
}
