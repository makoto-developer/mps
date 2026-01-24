defmodule SignalingWeb.Router do
  use Phoenix.Router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", SignalingWeb do
    pipe_through :api

    get "/health", HealthController, :check
  end
end

defmodule SignalingWeb.HealthController do
  use Phoenix.Controller

  def check(conn, _params) do
    json(conn, %{status: "ok", service: "signaling"})
  end
end

defmodule SignalingWeb.ErrorJSON do
  def render(template, _assigns) do
    %{errors: %{detail: Phoenix.Controller.status_message_from_template(template)}}
  end
end
