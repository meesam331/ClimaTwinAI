from werkzeug.serving import run_simple

from api.index import FLASK_PORT, app


if __name__ == "__main__":
    run_simple(
        "127.0.0.1",
        FLASK_PORT,
        app,
        use_debugger=False,
        use_reloader=False,
        threaded=True,
    )
