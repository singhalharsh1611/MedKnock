import React from 'react';
import { PotionCard } from '../components/PotionCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  // Mock data
  const todaysElixirs = [
    {
      id: '1',
      pillName: 'Healing Potion',
      dosage: '500mg',
      times: ['8:00 AM', '2:00 PM'],
      quantity: 28,
    },
    {
      id: '2',
      pillName: 'Strength Elixir',
      dosage: '250mg',
      times: ['9:00 AM'],
      quantity: 5,
      isRefillDue: true,
    },
  ];

  const adherenceData = [
    { day: 'Mon', rate: 95 },
    { day: 'Tue', rate: 100 },
    { day: 'Wed', rate: 85 },
    { day: 'Thu', rate: 100 },
    { day: 'Fri', rate: 90 },
    { day: 'Sat', rate: 100 },
    { day: 'Sun', rate: 95 },
  ];

  const currentStreak = 14;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, Alchemist! ✨
        </h1>
        <p className="text-muted-foreground">
          Your magical health journey continues today
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Streak */}
        <Card className="streak-counter">
          <div className="flex items-center justify-center gap-3">
            <Flame className="h-8 w-8" />
            <div>
              <p className="text-2xl font-bold">{currentStreak} Days</p>
              <p className="text-sm opacity-90">Current Streak</p>
            </div>
          </div>
        </Card>

        {/* Today's Progress */}
        <Card className="p-6 bg-gradient-to-br from-magical-blue/20 to-magical-purple/20">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-magical-blue" />
            <div>
              <p className="text-2xl font-bold text-foreground">2/3</p>
              <p className="text-sm text-muted-foreground">Elixirs Today</p>
            </div>
          </div>
        </Card>

        {/* Weekly Average */}
        <Card className="p-6 bg-gradient-to-br from-magical-green/20 to-magical-gold/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-magical-green" />
            <div>
              <p className="text-2xl font-bold text-foreground">95%</p>
              <p className="text-sm text-muted-foreground">Weekly Average</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Today's Elixirs */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Today's Elixirs</h2>
          <Badge variant="outline" className="text-magical-purple border-magical-purple">
            {todaysElixirs.length} due today
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {todaysElixirs.map((elixir) => (
            <PotionCard
              key={elixir.id}
              {...elixir}
              onLogTaken={(id) => console.log('Logged:', id)}
              onEdit={(id) => console.log('Edit:', id)}
              onDelete={(id) => console.log('Delete:', id)}
            />
          ))}
        </div>
      </section>

      {/* Wellness Rate Chart */}
      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-6">Wellness Rate</h2>
        <Card className="wellness-chart">
          <h3 className="text-xl font-semibold mb-4">7-Day Adherence</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={adherenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="day" stroke="white" />
              <YAxis stroke="white" />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="white" 
                strokeWidth={3}
                dot={{ fill: 'white', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;
