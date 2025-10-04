import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SignIn = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { signin, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: 'employee',
      email: '',
      password: '',
      company_name: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    const result = await signin(data);
    if (result.success) {
      // Redirect based on user role
      switch (result.user.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'manager':
          navigate('/manager/dashboard');
          break;
        case 'employee':
          navigate('/employee/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link
            to="/signup"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            register your company
          </Link>
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* Role Selection */}
        <div>
          <label htmlFor="role" className="form-label">
            Sign in as
          </label>
          <select
            {...register('role', { required: 'Please select your role' })}
            className="form-select"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          {errors.role && (
            <p className="form-error">{errors.role.message}</p>
          )}
        </div>

        {/* Company Name (for Manager and Employee) */}
        {selectedRole !== 'admin' && (
          <div>
            <label htmlFor="company_name" className="form-label">
              Company Name
            </label>
            <input
              type="text"
              {...register('company_name', {
                required: selectedRole !== 'admin' ? 'Company name is required' : false,
              })}
              className="form-input"
              placeholder="Enter your company name"
            />
            {errors.company_name && (
              <p className="form-error">{errors.company_name.message}</p>
            )}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          <input
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^\S+@\S+$/i,
                message: 'Invalid email address',
              },
            })}
            className="form-input"
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="form-error">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              className="form-input pr-10"
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex justify-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>

      {/* Demo Credentials */}
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Credentials:</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <div><strong>Admin:</strong> admin@demo.com / admin123</div>
          <div><strong>Manager:</strong> manager@demo.com / manager123</div>
          <div><strong>Employee:</strong> employee@demo.com / employee123</div>
          <div className="text-blue-600 mt-2">Company: Demo Company</div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;