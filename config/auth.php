<?php

return [
    'defaults' => ['guard' => 'web'],
    'guards' => ['web' => ['driver' => 'session', 'provider' => 'staff']],
    'providers' => ['staff' => ['driver' => 'eloquent', 'model' => App\Models\StaffUser::class]],
];
