import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Settings, Users, Trophy, Zap, Home, Menu, Bell } from 'lucide-react';
import Link from 'next/link';
import { getAdminScenarios } from '@/lib/data/admin-scenarios';
import { ScenarioAdminClient } from './scenario-admin-client';

// Use Node.js runtime for database operations
export const runtime = 'nodejs';

export default async function ScenarioAdminPage() {
  // Get initial data for server-side rendering
  let initialData;
  try {
    initialData = await getAdminScenarios({
      page: 1,
      limit: 20,
    });
  } catch (error) {
    console.error('Error fetching admin scenarios:', error);
    // Fallback data if database migration hasn't been run
    initialData = {
      scenarios: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
      },
    };
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <Link href="/">
                <div className="text-2xl font-bold text-primary">한국어</div>
              </Link>
              <div className="hidden md:block text-lg font-medium text-card-foreground">
                Korean Learning - Admin
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-card-foreground">
                  <Home className="w-4 h-4 mr-2" />
                  Back to App
                </Button>
              </Link>
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="hidden md:flex text-card-foreground">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex text-card-foreground">
                <Bell className="w-4 h-4" />
              </Button>
              
              <Button variant="ghost" size="sm" className="md:hidden text-card-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Scenario Management
              </h1>
              <p className="text-muted-foreground">
                Manage scenarios, tasks, and content for the Korean learning app
              </p>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              New Scenario
            </Button>
          </div>

          {/* Stats Cards - Moved to client component to avoid hydration issues */}
        </div>

        {/* Client Component for Interactive Features */}
        <Suspense fallback={<div>Loading...</div>}>
          <ScenarioAdminClient initialData={initialData} />
        </Suspense>
      </main>
    </div>
  );
}
