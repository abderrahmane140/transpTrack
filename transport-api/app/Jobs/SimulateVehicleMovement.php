<?php


namespace App\Jobs;

use App\Services\SimulationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SimulateVehicleMovement implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Interval between each location update in seconds.
     * Matches the real driver GPS posting frequency.
     */

    private const INTERVAL_SECONDS = 3;

    /**
     * Maximum number of retries if the job fails.
     */
    public int $tries = 3;


    /**
     * Maximum time the job can run in seconds.
     */
    public int $timeout = 10;

    public function __construct(
        public readonly int $tripId
    )
    {}


    public function handle(SimulationService $simulation)
    {
        // Check if simulation is still supposed to be running
        if (!$simulation->isRunning($this->tripId)) {
            Log::debug("Simulation for trip #{$this->tripId} is stopped. Job exiting.");
            return;
        }

        // Advance one step — returns true if more steps remain
        $hasMore = $simulation->step($this->tripId);

        if ($hasMore) {
            // Dispatch next step after INTERVAL_SECONDS delay
            // This creates a self-perpetuating chain of jobs
            static::dispatch($this->tripId)
                ->delay(now()->addSeconds(self::INTERVAL_SECONDS));
        } else {
            Log::info("Simulation for trip #{$this->tripId} has finished all waypoints.");
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error("SimulateVehicleMovement job failed for trip #{$this->tripId}: " . $exception->getMessage());
    }
}