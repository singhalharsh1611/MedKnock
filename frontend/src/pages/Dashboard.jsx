import React, { useEffect, useState } from "react";
import { MedicineCard } from "../components/MedicineCard";
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
import Loader from "@/components/Loader";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Dashboard = () => {
  const [todaysMedicines, setTodaysMedicines] = useState([]);
  const {token, user} = useAuth();
  const [takenDoses, setTakenDoses] = useState(0);
  const [totalDoses, setTotalDoses] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading,setLoading] = useState(false);

  const fetchSchdeules = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${backendUrl}/api/v1/schedules`, {
          headers:{
            Authorization:`Bearer ${token}`
          }
        })
        setTodaysMedicines(res.data.items);
        setTakenDoses(res.data.stats.takenDosesToday);
        setTotalDoses(res.data.stats.totalDosesToday);
        setCurrentStreak(res.data.currentStreak);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    }

  useEffect(() => {
    fetchSchdeules();
  }, [token]);


  const handleLogToken = async(scheduleId) => {
    try {
      setLoading(true);
      const res = await axios.post(`${backendUrl}/api/v1/doseLogs/${scheduleId}/taken`, {}, {
        headers:{
          Authorization: `Bearer ${token}`
        }
      })

      setTodaysMedicines(prev =>
        prev.map(e=>
          e.id === scheduleId
          ? {...e, quantity: res.data.quantity, canLog:false}:e
        )
      )
      await fetchSchdeules();
      setLoading(false);
    } catch (err) {
      console.error(err.response?.data?.message || err.message);
      toast.error("Error logging dose");
      setLoading(false);
    }
  }


  //for getting fcmToken
  useEffect(()=>{
    const requirePermission = async() => {
      try{
        const permission = await Notification.requestPermission();
        if(permission==='granted'){
          const messaging = getMessaging();
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim(); console.log("Current VAPID KEY in Dashboard:", vapidKey);
          await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            const swRegistration = await navigator.serviceWorker.ready;
            const fcmToken = await getToken(messaging, {vapidKey: vapidKey, serviceWorkerRegistration: swRegistration});
          // console.log("vk: ",vapidKey);
          

          if(fcmToken){
            await axios.post(`${backendUrl}/api/v1/notifications/subscribe`, {fcmToken}, { headers: { Authorization: `Bearer ${token}` }})
          }

          console.log("? NEW FCM TOKEN SUCCESSFULLY GENERATED: ", fcmToken);
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
    <>
      {loading && <Loader />}
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.firstName || "Medical"}! ✨
          </h1>
          <p className="text-muted-foreground">
            Your medical health journey continues today
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Today's Progress */}
          <Card className="p-6 bg-gradient-to-br from-medical-blue/20 to-medical-purple/20">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-medical-blue" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {takenDoses}/{totalDoses}
                </p>
                <p className="text-sm text-muted-foreground">Medicines Today</p>
              </div>
            </div>
          </Card>

          {/* Weekly Average */}
          <Card className="p-6 bg-gradient-to-br from-medical-green/20 to-medical-gold/20">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-medical-green" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {totalDoses > 0
                    ? `${((takenDoses / totalDoses) * 100).toFixed(1)}%`
                    : "0%"}
                </p>
                <p className="text-sm text-muted-foreground">Weekly Average</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Today's Medicines */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              Today's Medicines
            </h2>
            <Badge
              variant="outline"
              className="text-medical-purple border-medical-purple"
            >
              {todaysMedicines.length} due today
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {todaysMedicines.filter((m) => m.isActive).length === 0 ? (
              <Card className="col-span-full p-12 text-center flex flex-col items-center justify-center bg-medical-blue/5 border-dashed border-2">
                <p className="text-muted-foreground text-lg">No medicines scheduled for today.</p>
              </Card>
            ) : (
              todaysMedicines
                .filter((medicine) => medicine.isActive)
                .map((medicine) => (
                  <MedicineCard
                    key={medicine.id}
                    id={medicine.id}
                    {...medicine}
                    isRefillDue={medicine.quantity < 4}
                    onLogTaken={() => handleLogToken(medicine.id)}
                    onEdit={(id) => console.log("Edit:", id)}
                    onDelete={(id) => console.log("Delete:", id)}
                  />
                ))
            )}
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
    </>
  );
};

export default Dashboard;










