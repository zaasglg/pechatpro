<?php

namespace App\Models;

use Database\Factories\ProjectPriceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'album_type',
    'album_size',
    'cover_type',
    'page_count',
    'unit_price',
])]
class ProjectPrice extends Model
{
    /** @use HasFactory<ProjectPriceFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'page_count' => 'integer',
            'unit_price' => 'decimal:2',
        ];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public static function resolveForProjectAttributes(array $attributes): ?self
    {
        return self::query()
            ->where('album_type', $attributes['album_type'] ?? null)
            ->where('album_size', $attributes['album_size'] ?? null)
            ->where('cover_type', $attributes['cover_type'] ?? null)
            ->where('page_count', $attributes['page_count'] ?? null)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    public function toFrontendArray(): array
    {
        return [
            'id' => $this->id,
            'albumType' => $this->album_type,
            'albumSize' => $this->album_size,
            'coverType' => $this->cover_type,
            'pageCount' => $this->page_count,
            'unitPrice' => (float) $this->unit_price,
        ];
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }
}
