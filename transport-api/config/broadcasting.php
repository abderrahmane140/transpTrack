<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Broadcaster
    |--------------------------------------------------------------------------
    | Set to "reverb" — this tells Laravel to use Reverb for all
    | broadcast() calls, including the VehicleLocationUpdated event.
    */

    'default' => env('BROADCAST_CONNECTION', 'reverb'),

    'connections' => [

        /*
        |----------------------------------------------------------------------
        | Reverb — Laravel's official WebSocket server
        |----------------------------------------------------------------------
        */
        'reverb' => [
            'driver'  => 'reverb',
            'key'     => env('REVERB_APP_KEY', 'transport-key'),
            'secret'  => env('REVERB_APP_SECRET', 'transport-secret'),
            'app_id'  => env('REVERB_APP_ID', 'transport-app'),
            'options' => [
                'host'   => env('REVERB_HOST', 'localhost'),
                'port'   => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
            ],
            'timeout' => 30,
        ],

        /*
        |----------------------------------------------------------------------
        | Log — useful during testing (writes broadcast to laravel.log)
        |----------------------------------------------------------------------
        */
        'log' => [
            'driver' => 'log',
        ],

        /*
        |----------------------------------------------------------------------
        | Null — disables broadcasting (useful in unit tests)
        |----------------------------------------------------------------------
        */
        'null' => [
            'driver' => 'null',
        ],

    ],

];