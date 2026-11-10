# REST API

`/api/v1` follows the MCP tools (V5): the same data, the same rules, the same domain functions. Every request is the signed-in player's, sees only their own log (V2), and gets no spoiler unless it asks with `reveal` (V1). What the tools add for Claude (`next`) is left out. The description is `openapi.json` in the repository, generated from the route table in `backend/http/api.ts`, and served by an instance at `/api/v1/openapi.json` (with a token, like every route).

## Routes

Every route, with its parameters and its answers, as [`openapi.json`](openapi.json) describes them. Errors and their codes are in its description at the top. *Try it out* needs a token (see below) and an instance at `servers`.

<swagger-ui src="./openapi.json"/>

## Tokens

The API takes OAuth access tokens bound to it, and nothing else: not the browser's session cookie, and not a token for `/mcp` ([ADR 0007](../adr/0007-rest-api-tokens.md)). A script gets one once, through the browser:

1. **Register** at the registration endpoint from `<PUBLIC_URL>/.well-known/oauth-authorization-server/api/auth`, as a native client that asks for the API:

    ```json
    {
      "client_name": "My script",
      "application_type": "native",
      "redirect_uris": ["http://127.0.0.1:8123/callback"],
      "token_endpoint_auth_method": "none",
      "grant_types": ["authorization_code", "refresh_token"],
      "response_types": ["code"],
      "resources": ["<PUBLIC_URL>/api/v1"]
    }
    ```

2. **Authorize** in the browser with PKCE (`code_challenge_method=S256`), `scope=openid offline_access` and `resource=<PUBLIC_URL>/api/v1`; sign in and allow.
3. **Swap the code** at the token endpoint with the same `resource`. The access token lives 10 minutes; keep the refresh token and refresh with the same `resource`.
4. **Call** the API with `Authorization: Bearer <access token>`.

A refused request answers 401 with `WWW-Authenticate` pointing at `<PUBLIC_URL>/.well-known/oauth-protected-resource/api/v1`, where a client finds the authorization server.
