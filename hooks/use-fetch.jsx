import { useState } from "react";
import { toast } from "sonner";

const useFetch = (cb) => {
    const [data, setData] = useState(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fn = async (...args) => {
        setLoading(true);
        setError(null);

        try {
            const response = await cb(...args);
            setData(response);
            setError(null);
            return response;
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : typeof err === "string"
                    ? err
                    : "Something went wrong";
            setError(err);
            toast.error(message);
            return undefined;
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, fn, setData };
};

export default useFetch;
