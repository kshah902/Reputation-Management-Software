'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/store/auth';
import {
  User,
  Building2,
  Key,
  Bell,
  Globe,
  CreditCard,
  Shield,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'agency', label: 'Agency', icon: Building2 },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div>
      <Header title="Settings" />

      <div className="p-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>
                    Manage your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">First Name</label>
                      <Input defaultValue="John" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Last Name</label>
                      <Input defaultValue="Doe" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input defaultValue={user?.email} type="email" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <div className="mt-1">
                      <Badge>{user?.role}</Badge>
                    </div>
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'agency' && (
              <Card>
                <CardHeader>
                  <CardTitle>Agency Settings</CardTitle>
                  <CardDescription>
                    Manage your agency information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Agency Name</label>
                    <Input defaultValue="My Agency" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <Input placeholder="https://example.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input placeholder="(555) 123-4567" />
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'api' && (
              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for integrations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Production API Key</p>
                        <p className="text-sm text-gray-600">
                          rms_*****************************
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Copy
                        </Button>
                        <Button variant="outline" size="sm">
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button className="mt-4">Create New API Key</Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'integrations' && (
              <Card>
                <CardHeader>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>
                    Connect external services
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                        <Globe className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">Google Business Profile</p>
                        <p className="text-sm text-gray-600">
                          Sync reviews and business information
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <Globe className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Maileroo (Email)</p>
                        <p className="text-sm text-gray-600">
                          Send automated email campaigns
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">Connected</Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                        <Globe className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Telnyx (SMS)</p>
                        <p className="text-sm text-gray-600">
                          Send automated SMS campaigns
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Review Alerts</p>
                      <p className="text-sm text-gray-600">
                        Get notified when you receive new reviews
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Negative Review Alerts</p>
                      <p className="text-sm text-gray-600">
                        Instant alerts for reviews under 3 stars
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Campaign Completion</p>
                      <p className="text-sm text-gray-600">
                        Get notified when campaigns finish
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Reports</p>
                      <p className="text-sm text-gray-600">
                        Receive weekly performance summaries
                      </p>
                    </div>
                    <input type="checkbox" className="h-4 w-4" />
                  </div>
                  <Button>Save Preferences</Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'billing' && (
              <Card>
                <CardHeader>
                  <CardTitle>Billing & Plan</CardTitle>
                  <CardDescription>
                    Manage your subscription
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border-2 border-purple-500 bg-purple-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className="bg-purple-500">Professional Plan</Badge>
                        <p className="mt-2 text-2xl font-bold">$99/month</p>
                        <p className="text-sm text-gray-600">
                          Up to 10 clients, unlimited reviews
                        </p>
                      </div>
                      <Button variant="outline">Upgrade Plan</Button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="mb-4 font-medium">Payment Method</h3>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5" />
                        <div>
                          <p className="font-medium">•••• •••• •••• 4242</p>
                          <p className="text-sm text-gray-600">Expires 12/25</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>
                    Manage your account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="mb-2 font-medium">Change Password</h3>
                    <div className="space-y-3">
                      <Input type="password" placeholder="Current password" />
                      <Input type="password" placeholder="New password" />
                      <Input type="password" placeholder="Confirm new password" />
                      <Button>Update Password</Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="mb-2 font-medium">Two-Factor Authentication</h3>
                    <p className="mb-4 text-sm text-gray-600">
                      Add an extra layer of security to your account
                    </p>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="mb-2 font-medium">Active Sessions</h3>
                    <p className="mb-4 text-sm text-gray-600">
                      Manage devices where you&apos;re logged in
                    </p>
                    <Button variant="outline">View Sessions</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
