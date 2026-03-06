import { useQuery } from "@tanstack/react-query"
import { getAuthUser } from "../lib/api";

const useAuthUser = () => {
  // Check if token exists before making the query
  const hasToken = !!localStorage.getItem("token");
  
  const authUser = useQuery({
    queryKey: ["authUser"],
    queryFn: getAuthUser,
    retry: false,
    enabled: hasToken, // Only run query if token exists
  });

  return {
    isLoading: hasToken ? authUser.isLoading : false, // Don't show loading if no token
    authUser: authUser.data?.user
  }
}

export default useAuthUser