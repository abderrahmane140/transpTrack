<?php


namespace App\Jobs;

use App\Models\Trip;
use App\Models\VehicleLocation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CompressTripLocations implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Keep 1 location point per this many seconds for completed trips.
     * 30 seconds = ~90% reduction from 3-second resolution.
     */
    private const KEEP_INTERVAL_SECONDS = 30;

    public function __construct
    (
        public readonly Trip $trip,
    )
    {}

    public function handle(): void

    {
        //Only compress comleted trips
        if ($this->trip->status !== 'completed') {
            return;
        }

        Log::info("Compressing locations for trip #{$this->trip->id}");


        $locations = VehicleLocation::where('trip_id', $this->trip->id)
            ->orderBy('recorded_at')
            ->get(['id', 'recorded_at']);

        if ($locations->count() <= 10) {
            // Too few locations — nothing worth compressing
            return;
        }

        $idsToKeep = [];
        $lastKept = null;

        foreach($locations as $location) {
            $timestamp = $location->recorded_at->timestamp;

            if ($lastKept === null || ($timestamp - $lastKept) >= self::KEEP_INTERVAL_SECONDS) 
            {
                $idsToKeep[] = $location->id;
                $lastKept    = $timestamp;
            }
        }

        //Always keep the very first and last location
        $idsToKeep[] = $locations->first()->id;
        $idsToKeep[] = $locations->last()->id;
        $idsToKeep   = array_unique($idsToKeep);

        $beforeCount = $locations->count();

        //Delete everthing NOT in the keep list
        VehicleLocation::where('trip_id', $this->trip->id)
            ->whereNotIn('id', $idsToKeep)
            ->delete();

        $afterCount = count($idsToKeep);
        $reduction  = round((1 - $afterCount / $beforeCount) * 100);

        Log::info(
            "Trip #{$this->trip->id} compressed: {$beforeCount} → {$afterCount} locations ({$reduction}% reduction)"
        );
    }
}