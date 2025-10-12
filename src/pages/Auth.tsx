import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { user, signUp, signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const emailSchema = z.string().email();
  const passwordSchema = z.string().min(6);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      if (!email) {
        toast.error(t("emailRequired"));
        setLoading(false);
        return;
      }

      const emailValidation = emailSchema.safeParse(email);
      if (!emailValidation.success) {
        toast.error(t("emailRequired"));
        setLoading(false);
        return;
      }

      // Validate password
      if (!password) {
        toast.error(t("passwordRequired"));
        setLoading(false);
        return;
      }

      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        toast.error(t("passwordMinLength"));
        setLoading(false);
        return;
      }

      if (!isLogin) {
        if (password !== confirmPassword) {
          toast.error(t("passwordsNotMatch"));
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success(t("signupSuccess"));
          navigate("/dashboard");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(t("invalidCredentials"));
        } else {
          toast.success(t("loginSuccess"));
          navigate("/dashboard");
        }
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {isLogin ? t("login") : t("signup")}
            </CardTitle>
            <CardDescription>
              {isLogin ? t("dontHaveAccount") : t("alreadyHaveAccount")}
              <Button
                variant="link"
                className="p-0 ml-1"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? t("signup") : t("login")}
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("submitting") : (isLogin ? t("login") : t("signup"))}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
