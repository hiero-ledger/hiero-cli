export SOLO_CLUSTER_NAME=solo
export SOLO_NAMESPACE=solo
export SOLO_CLUSTER_SETUP_NAMESPACE=solo-cluster
export SOLO_DEPLOYMENT=solo-deployment

kind get clusters | grep '^solo' | while read cluster; do   kind delete cluster -n "$cluster"; done
solo one-shot single deploy
mirror-1-rest-5bc89d94c8-7vbml

# Find the pod with prefix mirror-1-rest across all namespaces
RESULT=$(kubectl get pods --all-namespaces --no-headers -o custom-columns=":metadata.namespace,:metadata.name" | grep '^.* mirror-1-rest' | head -n1)

# Check if a pod was found
if [ -z "$RESULT" ]; then
  echo "No pod found with prefix 'mirror-1-rest'"
  exit 1
fi

# Extract namespace and pod name
NAMESPACE=$(echo $RESULT | awk '{print $1}')
POD=$(echo $RESULT | awk '{print $2}')

# Forward the port
echo "Forwarding port 5551:5551 to pod $POD in namespace $NAMESPACE"
kubectl port-forward -n $NAMESPACE pod/$POD 5551:5551 >/dev/null 2>&1 &

pkill -f "kubectl port-forward.*mirror-1-rest"
solo one-shot single destroy