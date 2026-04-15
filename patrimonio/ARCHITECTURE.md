# ARCHITECTURE.md — Modelo de datos y reglas de negocio

## Modelos

### Asset
```
id:               string (uuid)
name:             string
category:         "cash" | "investment" | "real_estate" | "vehicle" | "other"
currency:         "ARS" | "USD"
value:            number
valuationDate:    string (ISO 8601)
notes:            string | null
linkedLiabilityId: string | null
```

### Liability
```
id:              string (uuid)
name:            string
category:        "mortgage" | "loan" | "debt" | "other"
currency:        "ARS" | "USD"
totalAmount:     number
remainingAmount: number
startDate:       string (ISO 8601)
endDate:         string | null
linkedAssetId:   string | null
notes:           string | null
```

### NetWorthSnapshot
```
id:                   string (uuid)
date:                 string (ISO 8601)
totalAssetsARS:       number
totalAssetsUSD:       number
totalLiabilitiesARS:  number
totalLiabilitiesUSD:  number
notes:                string | null
```

---

## Reglas de negocio

1. **Monedas separadas**: ARS y USD nunca se mezclan ni convierten. Todos los cálculos se hacen por separado para cada moneda.
2. **Activos vinculados a pasivos**: Un activo con `linkedLiabilityId` no se computa como activo neto de forma aislada. Se excluye del total de activos libres.
3. **Patrimonio neto**: Se calcula estrictamente como `totalActivos - totalPasivos`, por moneda, sin ajustes ni aproximaciones.
4. **Visualización de valores**: Todo número en pantalla debe ir acompañado de su moneda. Ningún número aparece sin denominación.

---

## localStorage keys

- `patrimonio:assets` → Array de Asset
- `patrimonio:liabilities` → Array de Liability
- `patrimonio:snapshots` → Array de NetWorthSnapshot
