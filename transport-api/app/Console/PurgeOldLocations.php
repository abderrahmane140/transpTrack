<?php

namespace App\Console\Commands;

use App\Models\VehicleLocation;
use Illuminate\Support\Facades\Log;
use Illuminate\Console\Command;

class PurgeOldLocations extends Command
{
    protected $signature  = 'locations:purge
                              {--days=90 : Delete location history older than this many days}
                              {--simulated : Only delete simulated trip locations}
                              {--dry-run : Show how many rows would be deleted without deleting}';

    protected $description = 'Purge old vehicle location records to keep the database lean';

    public function handle(): int
    {
        $days      = (int) $this->option('days');
        $simulated = $this->option('simulated');
        $dryRun    = $this->option('dry-run');
        $cutoff    = now()->subDays($days);

        $this->info("Purging location records older than {$days} days (before {$cutoff->toDateString()})");

        $query = VehicleLocation::where('recorded_at', '<', $cutoff);

        if ($simulated) {
            $query->whereHas('trip', fn($q) => $q->where('is_simulated', true));
            $this->info('Filtering to simulated trips only.');
        }

        $count = $query->count();

        if ($dryRun) {
            $this->warn("[DRY RUN] Would delete {$count} location records.");
            return Command::SUCCESS;
        }

        if ($count === 0) {
            $this->info('No records to purge.');
            return Command::SUCCESS;
        }

        $deleted = 0;

        $query->chunkById(1000, function ($locations) use (&$deleted) {
            $ids = $locations->pluck('id');
            VehicleLocation::whereIn('id', $ids)->delete();
            $deleted += $ids->count();
            $this->output->write('.');
        });

        $this->newLine();
        $this->info("✓ Deleted {$deleted} old location records.");

        Log::info("locations:purge — deleted {$deleted} records older than {$days} days");

        return Command::SUCCESS;
    }
}