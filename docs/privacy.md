# Privacy and permissions

- **`webRequest` and HTTP(S) host permissions:** observe completed response metadata across normal browsing tabs. Request bodies, page text, cookies, authentication headers, and URL paths are not stored.
- **`storage`:** retain domain names, aggregate byte and request counts, session start time, unmeasured-response count, and model settings on this device. Domain names are browsing data; use Reset to delete collected observations.
- **Incognito:** disabled in the manifest.
- **External requests:** none in the default estimation mode. Explicit grid lookup sends a selected zone to `http://localhost:3000`; the local server sends the zone and its provider credential to Electricity Maps. No domain list or browsing IP is forwarded.
- **Exports:** JSON downloads contain the stored domain aggregates and model settings. Review them before sharing.
- **Analytics:** none. No accounts, advertising, synchronization, or telemetry.

The original prototype’s hardcoded API credentials, remote backend address, IP lookup mechanism, and checked-in caches were removed during modernization. Previously exposed provider credentials must be revoked by their owner; deleting source does not revoke tokens or erase copies held elsewhere.
