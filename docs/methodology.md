# Estimation methodology

## Formula

```text
energy_kWh = observed_bytes / 1,000,000,000 × energy_kWh_per_GB
estimated_gCO2e = energy_kWh × grid_intensity_gCO2e_per_kWh
```

One decimal GB with the initial factors gives `1 × 0.81 × 400 = 324 g CO₂e`.

The 0.81 energy coefficient comes from the original hackathon implementation. It is retained as a visible, editable assumption, not a claim of present-day accuracy. The 400 grid factor is illustrative. No scientific calibration or benchmark accuracy is claimed.

## Observation scope

Only completed, successful HTTP(S) responses attached to normal tabs are considered. Cached responses are excluded. `Content-Length` must be a non-negative safe integer; missing and malformed sizes increase the unmeasured-response counter. A genuine zero-byte response is still measured.

Responses are attributed to the initiating hostname, or the destination hostname when no HTTP(S) initiator is available. This is domain attribution, not a perfect first-party page attribution system. Cross-origin frames and requests can be grouped under their initiator.

## Limits

- Headers describe response payloads, not complete network wire traffic. Protocol overhead, compression behavior, missing sizes, retries, uploads, and streaming complicate measurement.
- Browser-internal pages and traffic outside the extension’s permissions are absent. Incognito use is disabled in the manifest.
- One selected grid-intensity snapshot is applied to all observed bytes. The app does not infer each origin’s infrastructure location or actual power mix.
- The factor model is not a full lifecycle assessment of devices, networks, and data centres. Avoid interpreting it as a measured total personal footprint.
- Updating assumptions recalculates all historical bytes in the current session. This is scenario analysis, not a time-resolved emissions ledger.

The optional provider adapter uses [Electricity Maps](https://app.electricitymaps.com/docs). Provider data availability depends on your account and zone access. The timestamp and selected zone are displayed in the model panel; refresh explicitly when you need a new snapshot.
