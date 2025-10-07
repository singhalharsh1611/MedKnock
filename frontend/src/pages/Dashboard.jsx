import React, { useEffect, useState } from "react";
import { PotionCard } from "../components/PotionCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, Calendar } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getMessaging, getToken } from "firebase/messaging";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Dashboard = () => {
  const [todaysElixirs, setTodaysElixirs] = useState([]);
  const {token, user} = useAuth();
  const [takenDoses, setTakenDoses] = useState(0);
  const [totalDoses, setTotalDoses] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  const adherenceData = [
    { day: "Mon", rate: 95 },
    { day: "Tue", rate: 100 },
    { day: "Wed", rate: 85 },
    { day: "Thu", rate: 100 },
    { day: "Fri", rate: 90 },
    { day: "Sat", rate: 100 },
    { day: "Sun", rate: 95 },
  ];


  useEffect(() => {
    const fetchSchdeules = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/v1/schedules`, {
          headers:{
            Authorization:`Bearer ${token}`
          }
        })
        setTodaysElixirs(res.data.items);
        setTakenDoses(res.data.stats.takenDosesToday);
        setTotalDoses(res.data.stats.totalDosesToday);
        setCurrentStreak(res.data.currentStreak);
      } catch (error) {
        console.log(error);
      }
    }
    fetchSchdeules();
  }, [token]);


  const handleLogToken = async(scheduleId) => {
    try {
      const res = await axios.post(`${backendUrl}/api/v1/doseLogs/${scheduleId}/taken`, {}, {
        headers:{
          Authorization: `Bearer ${token}`
        }
      })

      setTodaysElixirs(prev =>
        prev.map(e=>
          e._id === scheduleId
          ? {...e, quantity: res.data.quantity, canLog:false}:e
        )
      )
    } catch (err) {
      console.error(err.response?.data?.message || err.message);
      toast.error("Error logging dose");
      
    }
  }


  //for getting fcmToken
  useEffect(()=>{
    const requirePermission = async() => {
      try{
        const permission = await Notification.requestPermission();
        if(permission==='granted'){
          const messaging = getMessaging();
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          const fcmToken = await getToken(messaging, {vapidKey: vapidKey});
          // console.log("vk: ",vapidKey);
          

          if(fcmToken){
            await axios.post(`${backendUrl}/api/v1/notifications/subscribe`, {fcmToken}, { headers: { Authorization: `Bearer ${token}` }})
          }

          // console.log("fcm token: ", fcmToken);
        }
      }catch(error){
        console.error('Error getting notification permission or token:', error);
      }
    }

    if(user && token){
      requirePermission();
    }
  }, [user, token]);

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
              <p className="text-2xl font-bold text-foreground">{takenDoses}/{totalDoses}</p>
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
          <h2 className="text-2xl font-semibold text-foreground">
            Today's Elixirs
          </h2>
          <Badge
            variant="outline"
            className="text-magical-purple border-magical-purple"
          >
            {todaysElixirs.length} due today
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {todaysElixirs
          .filter((elixir) => (elixir.isActive))
          .map((elixir) => (
            <PotionCard
              key={elixir._id}
              id={elixir._id}
              {...elixir}
              isRefillDue={elixir.quantity < 4}
              onLogTaken={()=>handleLogToken(elixir._id)}
              onEdit={(id) => console.log("Edit:", id)}
              onDelete={(id) => console.log("Delete:", id)}
            />
          ))}
        </div>
      </section>

      {/* Wellness Rate Chart */}
      {/* <section>
        <h2 className="text-2xl font-semibold text-foreground mb-6">
          Wellness Rate
        </h2>
        <Card className="wellness-chart">
          <h3 className="text-xl font-semibold mb-4">7-Day Adherence</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={adherenceData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis dataKey="day" stroke="white" />
              <YAxis stroke="white" />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="white"
                strokeWidth={3}
                dot={{ fill: "white", strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </section> */}
    </div>
  );
};

export default Dashboard;