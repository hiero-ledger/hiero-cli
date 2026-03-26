#!/usr/bin/env bash
# Non-interactive shells don't load ~/.bashrc, so system `node` (e.g. v12) wins unless we source nvm.

#Install kubectl
ARCH="$(dpkg --print-architecture)"
curl -fsSLo kubectl "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/${ARCH}/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/kubectl

#Install kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

#Install solo
npm install -g @hashgraph/solo@latest

rm -rf ~/.solo

export SOLO_CLUSTER_NAME=solo
export SOLO_NAMESPACE=solo
export SOLO_CLUSTER_SETUP_NAMESPACE=solo-cluster
export SOLO_DEPLOYMENT=solo-deployment

kind get clusters | grep '^solo' | while read cluster; do   kind delete cluster -n "$cluster"; done
echo "Deleted all solo clusters"

solo one-shot single deploy
echo "Deployed solo cluster"

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

#pkill -f "kubectl port-forward.*mirror-1-rest"
#solo one-shot single destroy