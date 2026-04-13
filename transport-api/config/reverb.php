<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Reverb Server
    |--------------------------------------------------------------------------
    | The default Reverb server to use when broadcasting. Since Reverb is
    | Laravel's own WebSocket server, there is only one driver: "reverb".
    */

    'default' => env('REVERB_SERVER', 'reverb'),

    'servers' => [

        'reverb' => [
            'host'    => env('REVERB_SERVER_HOST', '0.0.0.0'),
            'port'    => env('REVERB_SERVER_PORT', 8080),
            'hostname'=> env('REVERB_HOST', 'localhost'),

            'options' => [
                'tls' => [],
            ],

            /*
            |--------------------------------------------------------------
            | Maximum Request Size
            |--------------------------------------------------------------
            | Maximum size (in kilobytes) of incoming WebSocket messages.
            | GPS payloads are tiny (~200 bytes), so 64KB is more than enough.
            */
            'max_request_size' => env('REVERB_MAX_REQUEST_SIZE', 64),

            /*
            |--------------------------------------------------------------
            | Scaling (Redis pub/sub for multiple server nodes)
            |--------------------------------------------------------------
            | When scaling horizontally (multiple Reverb servers),
            | enable this so all nodes share broadcast events via Redis.
            | Leave disabled for single-server development.
            */
            'scaling' => [
                'enabled'    => env('REVERB_SCALING_ENABLED', false),
                'channel'    => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server'     => [
                    'url'      => env('REDIS_URL'),
                    'host'     => env('REDIS_HOST', '127.0.0.1'),
                    'port'     => env('REDIS_PORT', '6379'),
                    'username' => env('REDIS_USERNAME'),
                    'password' => env('REDIS_PASSWORD'),
                    'database' => env('REDIS_DB', '0'),
                ],
            ],

            /*
            |--------------------------------------------------------------
            | Pulse / Monitoring (optional Laravel Pulse integration)
            |--------------------------------------------------------------
            */
            'pulse_ingest_interval' => env('REVERB_PULSE_INGEST_INTERVAL', 15),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Reverb Applications
    |--------------------------------------------------------------------------
    | Each application has its own key/secret pair. In development we use
    | a single app. In production you could serve multiple apps from one
    | Reverb server.
    */

    'apps' => [

        'provider' => 'config',

        'apps' => [
            [
                'key'                    => env('REVERB_APP_KEY', 'transport-key'),
                'secret'                 => env('REVERB_APP_SECRET', 'transport-secret'),
                'app_id'                 => env('REVERB_APP_ID', 'transport-app'),
                'options'                => [
                    /*
                    |----------------------------------------------------------
                    | Allowed Origins
                    |----------------------------------------------------------
                    | List every origin your React frontend runs on.
                    | In production replace with your real domain.
                    */
                    'host'     => env('REVERB_HOST', 'localhost'),
                    'port'     => env('REVERB_PORT', 8080),
                    'scheme'   => env('REVERB_SCHEME', 'http'),
                    'useTLS'   => env('REVERB_SCHEME', 'http') === 'https',
                ],
                'allowed_origins'        => explode(',', env('REVERB_ALLOWED_ORIGINS', 'localhost:3000,localhost:5173')),
                'ping_interval'          => env('REVERB_APP_PING_INTERVAL', 60),
                'ping_timeout'           => env('REVERB_APP_PING_TIMEOUT', 10),
                'activity_timeout'       => env('REVERB_APP_ACTIVITY_TIMEOUT', 30),
                'max_message_size'       => env('REVERB_APP_MAX_MESSAGE_SIZE', 10000),
            ],
        ],
    ],

];