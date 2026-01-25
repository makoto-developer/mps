# Build stage
FROM elixir:1.15-alpine AS builder

# Install build dependencies including Rust
RUN apk add --no-cache build-base git rust cargo

WORKDIR /app

RUN mix local.hex --force && \
    mix local.rebar --force

ENV MIX_ENV=prod

COPY mix.exs ./
RUN mix deps.get --only prod
RUN mix deps.compile

COPY config ./config
COPY lib ./lib
COPY native ./native

RUN mix compile
RUN mix release

# Release stage
FROM alpine:3.18 AS runner

RUN apk add --no-cache libstdc++ openssl ncurses-libs wget libgcc

WORKDIR /app

RUN addgroup -S signaling && adduser -S signaling -G signaling

COPY --from=builder --chown=signaling:signaling /app/_build/prod/rel/signaling ./

USER signaling

ENV PHX_HOST=localhost
ENV PHX_PORT=22303

EXPOSE 22303

CMD ["bin/signaling", "start"]
