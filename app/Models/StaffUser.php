<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class StaffUser extends Authenticatable
{
    protected $fillable = ['name', 'username', 'password', 'role'];
    protected $hidden = ['password'];
    protected $casts = ['password' => 'hashed'];
}
